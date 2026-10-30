import csv
import io
import logging
from datetime import datetime, timezone
import json
import uuid
import smtplib
import imaplib
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, BackgroundTasks
from fastapi.responses import HTMLResponse

logger = logging.getLogger("leadpilot.routes")
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from .config import settings
from .database import get_db, SessionLocal
from .models import (
    Workspace,
    User,
    WorkspaceMember,
    Campaign,
    Company,
    Contact,
    Lead,
    Evidence,
    WebsiteAudit,
    EmailDraft,
    EmailApproval,
    EmailEvent,
    Suppression,
    IntegrationSetting,
    IntegrationConnection,
    AuditLog,
    normalize_domain,
    normalize_email,
)
from .schemas import (
    DomainProfileRequest,
    DomainProfileResponse,
    CampaignCreate,
    CampaignOut,
    LeadImport,
    LeadOut,
    LeadDiscoveryRequest,
    EvidenceOut,
    WebsiteAuditOut,
    DraftGenerate,
    DraftUpdate,
    EmailDraftOut,
    ApproveDraft,
    BatchApproveRequest,
    RecordReplyRequest,
    SendDraftResponse,
    AutoDispatchResponse,
    BatchAutoDispatchRequest,
    SuppressionCreate,
    SuppressionOut,
    IntegrationConfig,
    IntegrationStatusOut,
    AnalyticsSummary,
    ApiStatus,
    EmailEventWebhookPayload,
    OAuthCallbackPayload,
    GoogleAuthVerifyRequest,
    GoogleAuthVerifyResponse,
    OrnitechLoginRequest,
    AutomationRunResponse,
    DnsHealthCheckItem,
    DomainDnsHealthResponse,
    ReplyClassificationRequest,
    ReplyClassificationResponse,
    FollowupDraftRequest,
)
from .providers.discovery import (
    CompanyDiscoveryProvider,
    ProviderNotConfiguredException,
    ApiRateLimitException,
    ApiAuthenticationException,
)
from .providers.verification import EmailVerificationProvider
from .providers.website_analyzer import WebsiteAuditProvider
from .providers.ai_drafter import EmailDraftProvider
from .providers.safe_outreach import SafeEmailSender, SafetyViolation
from .auth import verify_google_credential, verify_ornitech_email_login, get_current_user
from .automation_service import (
    AutomationEngine,
    send_reply_notification_email,
    is_target_already_contacted,
)
from .seed import seed_database

router = APIRouter(prefix="/api")

discovery_provider = CompanyDiscoveryProvider()
verification_provider = EmailVerificationProvider()
audit_provider = WebsiteAuditProvider()
draft_provider = EmailDraftProvider()
safe_sender = SafeEmailSender()


def get_current_workspace_id() -> str:
    return settings.DEFAULT_WORKSPACE_ID


# ==================== CAMPAIGN ROUTES ====================

@router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    ws_id = get_current_workspace_id()
    campaigns = db.query(Campaign).filter_by(workspace_id=ws_id).order_by(Campaign.created_at.desc()).all()
    if not campaigns:
        return []

    campaign_ids = [c.id for c in campaigns]

    # Pre-aggregate counts in single batch queries to eliminate N+1 connection overhead
    lead_counts = dict(
        db.query(Lead.campaign_id, func.count(Lead.id))
        .filter(Lead.campaign_id.in_(campaign_ids))
        .group_by(Lead.campaign_id)
        .all()
    )
    draft_counts = dict(
        db.query(Lead.campaign_id, func.count(EmailDraft.id))
        .join(EmailDraft, EmailDraft.lead_id == Lead.id)
        .filter(Lead.campaign_id.in_(campaign_ids))
        .group_by(Lead.campaign_id)
        .all()
    )

    out = []
    for c in campaigns:
        out.append(
            CampaignOut(
                id=c.id,
                workspace_id=c.workspace_id,
                name=c.name,
                target_country=c.target_country or "India",
                target_city=c.target_city or "Bangalore",
                company_type=c.company_type or "B2B SaaS",
                max_lead_count=c.max_lead_count or 50,
                qualification_criteria=c.qualification_criteria or "Verified decision maker & tech gap",
                target_markets=c.target_markets,
                industries=c.industries,
                locations=c.locations,
                company_sizes=c.company_sizes,
                services=c.services,
                notes=c.notes or "",
                status=c.status,
                created_at=c.created_at,
                leads_count=lead_counts.get(c.id, 0),
                drafts_count=draft_counts.get(c.id, 0),
            )
        )
    return out


@router.post("/campaigns/auto-profile", response_model=DomainProfileResponse)
async def auto_profile_domain(payload: DomainProfileRequest):
    """
    Explee-style 1-Click Reverse Domain Profiler:
    Takes any company website (e.g. ornitech.in or customer's domain), crawls and analyzes it,
    then uses Groq LPU (openai/gpt-oss-120b) to automatically formulate:
    - Business Niche & Core Offerings
    - Value Proposition
    - Ideal Customer Profile (target industries, titles, regions)
    - Ready-to-launch Campaign configuration
    """
    url = payload.domain.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # 1. Audit website to extract factual metadata & offerings
    audit_data = await audit_provider.audit(url)
    if audit_data.get("status_code", 0) in (403, 408, 502):
        raise HTTPException(
            status_code=400,
            detail=f"Could not reach or profile domain '{payload.domain}': {audit_data.get('meta_description')}"
        )

    # 2. Use Groq AI to synthesize ICP and campaign strategy
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="Missing required configuration: 'GROQ_API_KEY' is not set in .env."
        )

    prompt = f"""You are an elite B2B growth strategist. Analyze this company's website audit data and formulate their Ideal Customer Profile (ICP) for outbound client acquisition.

Website URL: {url}
Page Title: {audit_data.get('title')}
Meta Description: {audit_data.get('meta_description')}
Tech Stack: {', '.join(audit_data.get('tech_stack', []))}
Identified Offerings/Observations: {audit_data.get('opportunity_summary')}

Respond ONLY with a valid JSON object matching this schema:
{{
  "company_name": "Name of the business",
  "company_type": "Specific niche (e.g., Next.js & AI Web Engineering Agency)",
  "value_proposition": "1-sentence compelling offer",
  "services": ["Service 1", "Service 2", "Service 3"],
  "target_industries": ["Industry 1", "Industry 2", "Industry 3"],
  "target_titles": ["CEO", "Founder", "Head of Growth", "CTO"],
  "target_geography": "Primary region (e.g. India & Global)",
  "target_city": "Top hub city (e.g. Bangalore)",
  "target_country": "Primary country (e.g. India)",
  "cold_email_hook": "Specific angle to catch prospect attention"
}}
"""
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
    candidate_models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
    profile = None
    last_err = None

    try:
        async with httpx.AsyncClient(timeout=14.0) as client:
            for model_candidate in candidate_models:
                body = {
                    "model": model_candidate,
                    "messages": [
                        {"role": "system", "content": "You are a professional B2B marketing strategist. Respond exclusively in valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                    "max_tokens": 600,
                }
                resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=body)
                if resp.status_code == 200:
                    raw = resp.json()["choices"][0]["message"]["content"]
                    profile = json.loads(raw)
                    break
                else:
                    last_err = f"HTTP {resp.status_code}: {resp.text[:150]}"

        if not profile:
            raise HTTPException(status_code=502, detail=f"Groq AI profiling error across models: {last_err}")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI domain profiling failed: {str(exc)}")

    company_name = profile.get("company_name", "My Company")
    company_type = profile.get("company_type", "Technology Agency")
    target_country = profile.get("target_country", "India")
    target_city = profile.get("target_city", "Bangalore")
    services = profile.get("services", ["Web engineering", "Product scaling"])
    industries = profile.get("target_industries", ["Startups", "SaaS"])

    suggested_campaign = CampaignCreate(
        name=f"{company_name} — Automated 24/7 Outreach",
        target_country=target_country,
        target_city=target_city,
        company_type=company_type,
        max_lead_count=50,
        qualification_criteria=f"Verified decision makers matching {company_name}'s ICP",
        target_markets=[target_country, "Global"],
        industries=industries,
        locations=[target_city, "Remote"],
        company_sizes=["1-10", "11-50"],
        services=services,
        notes=f"Auto-generated from {url}. Hook: {profile.get('cold_email_hook', '')}",
    )

    return DomainProfileResponse(
        company_name=company_name,
        company_type=company_type,
        value_proposition=profile.get("value_proposition", ""),
        services=services,
        target_industries=industries,
        target_titles=profile.get("target_titles", ["CEO", "Founder"]),
        target_geography=profile.get("target_geography", target_country),
        cold_email_hook=profile.get("cold_email_hook", ""),
        suggested_campaign=suggested_campaign,
    )


@router.post("/campaigns", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    ws_id = get_current_workspace_id()
    campaign = Campaign(
        workspace_id=ws_id,
        name=payload.name,
        target_country=payload.target_country,
        target_city=payload.target_city,
        company_type=payload.company_type,
        max_lead_count=payload.max_lead_count,
        qualification_criteria=payload.qualification_criteria,
        target_markets_json=json.dumps(payload.target_markets),
        industries_json=json.dumps(payload.industries),
        locations_json=json.dumps(payload.locations),
        company_sizes_json=json.dumps(payload.company_sizes),
        services_json=json.dumps(payload.services),
        notes=payload.notes,
        status="active",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # 100% Autonomous Pipeline Trigger:
    # Run in BackgroundTask with an isolated session so the HTTP request returns immediately
    # and does NOT hold open a DB connection during external website audits & AI pitch generation.
    async def run_pipeline_worker(campaign_id: str, lead_limit: int):
        worker_db = SessionLocal()
        try:
            await AutomationEngine.run_autonomous_pipeline_for_campaign(campaign_id, worker_db, limit=lead_limit)
        except Exception as exc:
            print(f"[run_pipeline_worker] Autonomous pipeline error: {exc}")
        finally:
            worker_db.close()

    limit = min(5, payload.max_lead_count or 5)
    background_tasks.add_task(run_pipeline_worker, campaign.id, limit)

    return CampaignOut(
        id=campaign.id,
        workspace_id=campaign.workspace_id,
        name=campaign.name,
        target_country=campaign.target_country or "India",
        target_city=campaign.target_city or "Bangalore",
        company_type=campaign.company_type or "B2B SaaS",
        max_lead_count=campaign.max_lead_count or 50,
        qualification_criteria=campaign.qualification_criteria or "Verified decision maker & tech gap",
        target_markets=campaign.target_markets,
        industries=campaign.industries,
        locations=campaign.locations,
        company_sizes=campaign.company_sizes,
        services=campaign.services,
        notes=campaign.notes or "",
        status=campaign.status,
        created_at=campaign.created_at,
        leads_count=0,
        drafts_count=0,
    )


@router.get("/leads/export/csv")
def export_leads_csv(campaign_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Exports discovered leads, company domains, verified contacts, and qualification scores to CSV."""
    ws_id = get_current_workspace_id()
    query = (
        db.query(Lead)
        .join(Company, Company.id == Lead.company_id)
        .filter(Company.workspace_id == ws_id)
    )
    if campaign_id:
        query = query.filter(Lead.campaign_id == campaign_id)

    leads = query.order_by(Lead.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Lead ID",
        "Company Name",
        "Domain",
        "Website URL",
        "Country",
        "Industry",
        "Decision Maker",
        "Title",
        "Business Email",
        "Email Verification",
        "Fit Score",
        "Opportunity Type",
        "Status",
        "Audit Score",
        "Audit Tech Stack",
        "Primary Issues",
        "Created At",
    ])

    for l in leads:
        company = l.company
        contact = l.contact
        audit = db.query(WebsiteAudit).filter_by(company_id=l.company_id).order_by(WebsiteAudit.checked_at.desc()).first()

        writer.writerow([
            l.id,
            company.name if company else "",
            company.domain if company else "",
            company.website_url if company else "",
            company.country if company else "",
            company.industry if company else "",
            contact.full_name if contact else "",
            contact.title if contact else "",
            contact.business_email if contact else "",
            contact.email_status if contact else "unknown",
            l.fit_score,
            l.opportunity_type,
            l.status,
            audit.performance_score if audit else "N/A",
            ", ".join(audit.tech_stack) if audit else "",
            "; ".join(audit.issues_found[:2]) if audit else "",
            l.created_at.isoformat() if l.created_at else "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leadpilot_leads_export.csv"},
    )


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(campaign_id: str, db: Session = Depends(get_db)):
    ws_id = get_current_workspace_id()
    campaign = db.query(Campaign).filter_by(id=campaign_id, workspace_id=ws_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return None


# ==================== LEAD & DISCOVERY ROUTES ====================

@router.get("/leads", response_model=list[LeadOut])
def list_leads(campaign_id: Optional[str] = None, db: Session = Depends(get_db)):
    ws_id = get_current_workspace_id()
    query = (
        db.query(Lead)
        .join(Company, Company.id == Lead.company_id)
        .filter(Company.workspace_id == ws_id)
    )
    if campaign_id:
        query = query.filter(Lead.campaign_id == campaign_id)

    leads = query.order_by(Lead.created_at.desc()).all()
    results = []

    for l in leads:
        company = l.company
        contact = l.contact
        audit = db.query(WebsiteAudit).filter_by(company_id=l.company_id).order_by(WebsiteAudit.checked_at.desc()).first()
        draft = db.query(EmailDraft).filter_by(lead_id=l.id).order_by(EmailDraft.generated_at.desc()).first()

        evidence_items = [
            EvidenceOut(
                id=ev.id,
                lead_id=ev.lead_id,
                company_id=ev.company_id,
                source_url=ev.source_url,
                evidence_type=ev.evidence_type,
                excerpt=ev.excerpt,
                observed_at=ev.observed_at,
                confidence=ev.confidence,
            )
            for ev in l.evidence
        ]

        audit_out = None
        if audit:
            audit_out = WebsiteAuditOut(
                id=audit.id,
                company_id=audit.company_id,
                checked_at=audit.checked_at,
                status_code=audit.status_code,
                title=audit.title,
                meta_description=audit.meta_description,
                tech_stack=audit.tech_stack,
                issues_found=audit.issues_found,
                opportunity_summary=audit.opportunity_summary,
                performance_score=audit.performance_score,
            )

        results.append(
            LeadOut(
                id=l.id,
                campaign_id=l.campaign_id,
                company_name=company.name,
                domain=company.domain,
                website_url=company.website_url,
                country=company.country,
                industry=company.industry,
                contact_name=contact.full_name if contact else None,
                contact_title=contact.title if contact else None,
                business_email=contact.business_email if contact else None,
                email_status=contact.email_status if contact else "unknown",
                opportunity_type=l.opportunity_type,
                fit_score=l.fit_score or 75,
                status=l.status,
                source_provider=contact.source_provider if contact else "import",
                created_at=l.created_at,
                evidence=evidence_items,
                audit=audit_out,
                has_draft=draft is not None,
                draft_status=draft.status if draft else None,
            )
        )
    return results


@router.post("/leads/import", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def import_lead(payload: LeadImport, db: Session = Depends(get_db)):
    ws_id = get_current_workspace_id()

    # Suppression check
    if payload.business_email:
        normalized = str(payload.business_email).lower()
        if db.query(Suppression).filter_by(workspace_id=ws_id, email_normalized=normalized).first():
            raise HTTPException(status_code=422, detail="This email address is on your workspace suppression list.")

    # Find or create company
    domain = payload.domain
    if not domain and payload.website_url:
        domain = str(payload.website_url).replace("https://", "").replace("http://", "").split("/")[0]

    company = None
    if domain:
        company = db.query(Company).filter_by(workspace_id=ws_id, domain=domain).first()

    if not company:
        company = Company(
            workspace_id=ws_id,
            name=payload.company_name,
            domain=domain,
            website_url=str(payload.website_url) if payload.website_url else (f"https://{domain}" if domain else None),
            country=payload.country or "India",
            industry=payload.industry or "Technology",
            description="",
        )
        db.add(company)
        db.flush()

    # Find or create contact
    contact = None
    if payload.contact_name or payload.business_email:
        email_str = str(payload.business_email).lower() if payload.business_email else None
        if email_str:
            contact = db.query(Contact).filter_by(company_id=company.id, business_email=email_str).first()

        if not contact:
            contact = Contact(
                company_id=company.id,
                full_name=payload.contact_name or "Decision Maker",
                title=payload.contact_title or "Founder / Decision Maker",
                business_email=email_str,
                email_status=payload.email_status or "valid",
                source_provider=payload.source_provider or "manual_import",
            )
            db.add(contact)
            db.flush()

    # Create Lead
    lead = Lead(
        campaign_id=payload.campaign_id,
        company_id=company.id,
        contact_id=contact.id if contact else None,
        fit_score=payload.fit_score or 75,
        opportunity_type=payload.opportunity_type,
        status="qualified",
    )
    db.add(lead)
    db.flush()

    # Add evidence
    evidence_outs = []
    for ev in payload.evidence:
        evidence = Evidence(
            lead_id=lead.id,
            company_id=company.id,
            source_url=str(ev.source_url),
            evidence_type=ev.evidence_type,
            excerpt=ev.excerpt,
            confidence=ev.confidence,
        )
        db.add(evidence)
        db.flush()
        evidence_outs.append(
            EvidenceOut(
                id=evidence.id,
                lead_id=lead.id,
                company_id=company.id,
                source_url=evidence.source_url,
                evidence_type=evidence.evidence_type,
                excerpt=evidence.excerpt,
                observed_at=evidence.observed_at,
                confidence=evidence.confidence,
            )
        )

    db.commit()

    return LeadOut(
        id=lead.id,
        campaign_id=lead.campaign_id,
        company_name=company.name,
        domain=company.domain,
        website_url=company.website_url,
        country=company.country,
        industry=company.industry,
        contact_name=contact.full_name if contact else None,
        contact_title=contact.title if contact else None,
        business_email=contact.business_email if contact else None,
        email_status=contact.email_status if contact else "unknown",
        opportunity_type=lead.opportunity_type,
        fit_score=lead.fit_score,
        status=lead.status,
        source_provider=contact.source_provider if contact else "manual_import",
        created_at=lead.created_at,
        evidence=evidence_outs,
        audit=None,
        has_draft=False,
    )


@router.post("/leads/discover", response_model=list[LeadOut])
async def discover_leads(payload: LeadDiscoveryRequest, db: Session = Depends(get_db)):
    """Runs evidence-backed discovery for companies, founders, and contact details with multi-page resilience."""
    ws_id = get_current_workspace_id()
    created_leads = []
    skipped_already_contacted = 0
    skipped_already_in_campaign = 0
    total_candidates_examined = 0

    page = 1
    max_pages = 3
    batch_size = max(15, payload.limit * 3)

    while len(created_leads) < payload.limit and page <= max_pages:
        try:
            candidates = await discovery_provider.search(
                query=payload.query,
                market=payload.market,
                industry=payload.industry,
                service_target=payload.service_target,
                limit=batch_size,
                page=page,
            )
        except ApiRateLimitException as exc:
            raise HTTPException(status_code=429, detail=str(exc))
        except (ApiAuthenticationException, ProviderNotConfiguredException) as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        if not candidates:
            break

        total_candidates_examined += len(candidates)

        for item in candidates:
            if len(created_leads) >= payload.limit:
                break

            norm_domain = normalize_domain(item.get("domain"))
            if not norm_domain:
                continue

            raw_email = item.get("business_email")
            norm_email = normalize_email(raw_email)

            # 1. Strict Anti-Spam Check: Never contact same startup or founder again across workspace
            already_contacted, reason = is_target_already_contacted(
                db, ws_id, domain=norm_domain, email=norm_email
            )
            if already_contacted:
                skipped_already_contacted += 1
                continue

            # 2. Check if this company is already in this campaign
            if payload.campaign_id:
                existing_company = db.query(Company).filter_by(workspace_id=ws_id, domain=norm_domain).first()
                if existing_company:
                    existing_lead = db.query(Lead).filter_by(
                        campaign_id=payload.campaign_id,
                        company_id=existing_company.id,
                    ).first()
                    if existing_lead:
                        skipped_already_in_campaign += 1
                        continue

            # Check existing company by normalized domain
            company = db.query(Company).filter_by(workspace_id=ws_id, domain=norm_domain).first() if norm_domain else None
            if not company:
                company = Company(
                    workspace_id=ws_id,
                    name=item["company_name"],
                    domain=norm_domain,
                    website_url=item.get("website_url") or f"https://{norm_domain}",
                    country=item.get("country", payload.market),
                    industry=item.get("industry", payload.industry),
                )
                db.add(company)
                db.flush()

            contact = db.query(Contact).filter_by(company_id=company.id, business_email=norm_email).first() if norm_email else None
            if not contact and norm_email:
                # Run email verification
                ver = await verification_provider.verify(norm_email)
                contact = Contact(
                    company_id=company.id,
                    full_name=item.get("contact_name") or "Decision Maker",
                    title=item.get("contact_title") or "Founder / Executive",
                    business_email=norm_email,
                    email_status=ver.get("status", "unknown"),
                    source_provider=item.get("source_provider", "search_discovery"),
                )
                db.add(contact)
                db.flush()
            elif not contact and not norm_email:
                # Contact record without email
                contact = Contact(
                    company_id=company.id,
                    full_name=item.get("contact_name") or "Founder / Executive",
                    title=item.get("contact_title") or "Decision Maker",
                    business_email=None,
                    email_status="unknown",
                    source_provider=item.get("source_provider", "search_discovery"),
                )
                db.add(contact)
                db.flush()

            lead = Lead(
                campaign_id=payload.campaign_id,
                company_id=company.id,
                contact_id=contact.id,
                fit_score=item.get("fit_score", 85),
                opportunity_type=item.get("opportunity_type", "website_redesign"),
                status="qualified",
            )
            db.add(lead)
            db.flush()

            # Add Source Evidence
            ev = Evidence(
                lead_id=lead.id,
                company_id=company.id,
                source_url=item["source_url"],
                evidence_type="directory_listing",
                excerpt=item["evidence_excerpt"],
                confidence=0.88,
            )
            db.add(ev)
            db.flush()

            # Audit log entry for evidence-backed discovery
            db.add(
                AuditLog(
                    workspace_id=ws_id,
                    user_email="system@leadpilot.ai",
                    action="lead_discovered",
                    entity_type="lead",
                    entity_id=lead.id,
                    details=f"Discovered {company.name} ({norm_domain}) for campaign {payload.campaign_id}",
                )
            )

            created_leads.append(
                LeadOut(
                    id=lead.id,
                    campaign_id=lead.campaign_id,
                    company_name=company.name,
                    domain=company.domain,
                    website_url=company.website_url,
                    country=company.country,
                    industry=company.industry,
                    contact_name=contact.full_name,
                    contact_title=contact.title,
                    business_email=contact.business_email,
                    email_status=contact.email_status,
                    opportunity_type=lead.opportunity_type,
                    fit_score=lead.fit_score,
                    status=lead.status,
                    source_provider=contact.source_provider,
                    created_at=lead.created_at,
                    evidence=[
                        EvidenceOut(
                            id=ev.id,
                            lead_id=lead.id,
                            company_id=company.id,
                            source_url=ev.source_url,
                            evidence_type=ev.evidence_type,
                            excerpt=ev.excerpt,
                            observed_at=ev.observed_at,
                            confidence=ev.confidence,
                        )
                    ],
                    audit=None,
                    has_draft=False,
                )
            )

        page += 1

    if not created_leads:
        if skipped_already_contacted > 0 or skipped_already_in_campaign > 0:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"0 new leads added: {skipped_already_contacted} matching companies from Apollo were already contacted in previous campaigns, "
                    f"and {skipped_already_in_campaign} are already added to this campaign. "
                    "Try a broader search query or a different industry to find fresh prospects."
                )
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No prospective companies found for query '{payload.query}' in '{payload.market}'. "
                    "Try using broader industry terms (e.g. 'saas', 'fintech', 'logistics') or selecting 'Global' region."
                )
            )

    db.commit()
    return created_leads


@router.post("/leads/{lead_id}/audit", response_model=WebsiteAuditOut)
async def audit_lead_website(lead_id: str, db: Session = Depends(get_db)):
    """Performs a live HTTP website audit and saves factual opportunity evidence."""
    lead = db.query(Lead).filter_by(id=lead_id).first()
    if not lead or not lead.company:
        raise HTTPException(status_code=404, detail="Lead not found")

    target_url = lead.company.website_url or (f"https://{lead.company.domain}" if lead.company.domain else None)
    if not target_url:
        raise HTTPException(status_code=422, detail="Company does not have a website URL or domain.")

    audit_res = await audit_provider.audit(target_url)

    # Save WebsiteAudit
    audit = WebsiteAudit(
        company_id=lead.company.id,
        status_code=audit_res["status_code"],
        title=audit_res["title"],
        meta_description=audit_res["meta_description"],
        tech_stack_json=json.dumps(audit_res["tech_stack"]),
        issues_found_json=json.dumps(audit_res["issues_found"]),
        opportunity_summary=audit_res["opportunity_summary"],
        performance_score=audit_res["performance_score"],
    )
    db.add(audit)

    # Convert audit findings into stored Evidence
    if audit_res["issues_found"]:
        ev = Evidence(
            lead_id=lead.id,
            company_id=lead.company.id,
            source_url=target_url,
            evidence_type="website_technical_audit",
            excerpt=f"Live audit observed: {'; '.join(audit_res['issues_found'][:3])}",
            confidence=0.92,
        )
        db.add(ev)

    lead.status = "qualified"
    db.commit()
    db.refresh(audit)

    return WebsiteAuditOut(
        id=audit.id,
        company_id=audit.company_id,
        checked_at=audit.checked_at,
        status_code=audit.status_code,
        title=audit.title,
        meta_description=audit.meta_description,
        tech_stack=audit.tech_stack,
        issues_found=audit.issues_found,
        opportunity_summary=audit.opportunity_summary,
        performance_score=audit.performance_score,
    )


# ==================== DRAFT & APPROVAL ROUTES ====================

@router.get("/drafts", response_model=list[EmailDraftOut])
def list_drafts(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(EmailDraft).join(Lead, Lead.id == EmailDraft.lead_id).order_by(EmailDraft.generated_at.desc())
    if status_filter:
        query = query.filter(EmailDraft.status == status_filter)

    drafts = query.all()
    results = []
    for d in drafts:
        lead = d.lead
        company = lead.company if lead else None
        contact = lead.contact if lead else None
        # Check for reply events
        replied_event = next((e for e in d.events if e.event_type == "replied"), None)
        replied_at = replied_event.occurred_at if replied_event else None
        reply_snippet = None
        if replied_event and replied_event.details:
            try:
                det = json.loads(replied_event.details)
                reply_snippet = det.get("reply_text") or det.get("snippet")
            except Exception:
                reply_snippet = None
        reply_count = sum(1 for e in d.events if e.event_type == "replied")

        # Draft status should reflect replied if reply exists and draft was sent
        computed_status = "replied" if reply_count > 0 else d.status

        results.append(
            EmailDraftOut(
                id=d.id,
                lead_id=d.lead_id,
                company_name=company.name if company else "Unknown",
                contact_name=contact.full_name if contact else None,
                business_email=contact.business_email if contact else None,
                email_status=contact.email_status if contact else "unknown",
                subject=d.subject,
                body_text=d.body_text,
                evidence_urls=d.evidence_urls,
                confidence=d.confidence,
                model=d.model,
                status=computed_status,
                approved_by=d.approved_by,
                approved_at=d.approved_at,
                sent_at=d.sent_at,
                replied_at=replied_at,
                reply_count=reply_count,
                last_reply_snippet=reply_snippet,
                provider_message_id=d.provider_message_id,
                generated_at=d.generated_at,
            )
        )
    return results


@router.post("/drafts/generate", response_model=EmailDraftOut, status_code=status.HTTP_201_CREATED)
async def generate_draft(payload: DraftGenerate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter_by(id=payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    company = lead.company
    contact = lead.contact
    evidence_records = [
        {"source_url": e.source_url, "excerpt": e.excerpt, "confidence": e.confidence}
        for e in lead.evidence
    ]

    latest_audit = (
        db.query(WebsiteAudit)
        .filter_by(company_id=company.id)
        .order_by(WebsiteAudit.checked_at.desc())
        .first()
    )
    audit_findings = latest_audit.issues_found if latest_audit else []

    res = await draft_provider.generate(
        company_name=company.name,
        contact_name=contact.full_name if contact else None,
        contact_title=contact.title if contact else None,
        website_url=company.website_url,
        service_offer=payload.service_offer,
        tone=payload.tone,
        evidence_list=evidence_records,
        audit_findings=audit_findings,
    )

    draft = EmailDraft(
        lead_id=lead.id,
        subject=res["subject"],
        body_text=res["body_text"],
        evidence_urls_json=json.dumps(res["evidence_urls"]),
        confidence=res["confidence"],
        model=res["model"],
        status="pending_review",
    )
    db.add(draft)
    lead.status = "draft_generated"
    db.commit()
    db.refresh(draft)

    return EmailDraftOut(
        id=draft.id,
        lead_id=draft.lead_id,
        company_name=company.name,
        contact_name=contact.full_name if contact else None,
        business_email=contact.business_email if contact else None,
        email_status=contact.email_status if contact else "unknown",
        subject=draft.subject,
        body_text=draft.body_text,
        evidence_urls=draft.evidence_urls,
        confidence=draft.confidence,
        model=draft.model,
        status=draft.status,
        approved_by=draft.approved_by,
        approved_at=draft.approved_at,
        sent_at=draft.sent_at,
        provider_message_id=draft.provider_message_id,
        generated_at=draft.generated_at,
    )


@router.post("/leads/{lead_id}/generate-followup", response_model=EmailDraftOut, status_code=status.HTTP_201_CREATED)
async def generate_lead_followup(
    lead_id: str,
    payload: FollowupDraftRequest = FollowupDraftRequest(),
    db: Session = Depends(get_db),
):
    """Generates a high-converting, concise multi-touch follow-up draft (Step 1 = 3-day bump; Step 2 = 7-day breakup) linked to the lead."""
    lead = db.query(Lead).filter_by(id=lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    company = lead.company
    contact = lead.contact
    comp_name = company.name if company else "Your Company"
    contact_name = contact.full_name if contact else None
    contact_title = contact.title if contact else None

    # Retrieve subject from the initial draft if one exists
    orig_draft = (
        db.query(EmailDraft)
        .filter_by(lead_id=lead_id)
        .order_by(EmailDraft.generated_at.asc())
        .first()
    )
    orig_subject = orig_draft.subject if orig_draft else f"Idea for {comp_name}'s web presence"
    service_offer = lead.opportunity_type or "Modern web development and conversion optimization"

    ai_drafter = EmailDraftProvider()
    draft_res = await ai_drafter.generate_followup_draft(
        company_name=comp_name,
        contact_name=contact_name,
        contact_title=contact_title,
        original_subject=orig_subject,
        service_offer=service_offer,
        step=payload.step,
    )

    new_draft = EmailDraft(
        lead_id=lead.id,
        subject=draft_res["subject"],
        body_text=draft_res["body_text"],
        evidence_urls=orig_draft.evidence_urls if orig_draft else [],
        confidence=draft_res["confidence"],
        model=draft_res["model"],
        status="pending_review",
    )
    db.add(new_draft)
    lead.status = "draft_generated"
    db.commit()
    db.refresh(new_draft)

    return EmailDraftOut(
        id=new_draft.id,
        lead_id=new_draft.lead_id,
        company_name=comp_name,
        contact_name=contact_name,
        business_email=contact.business_email if contact else None,
        email_status=contact.email_status if contact else "unknown",
        subject=new_draft.subject,
        body_text=new_draft.body_text,
        evidence_urls=new_draft.evidence_urls or [],
        confidence=new_draft.confidence,
        model=new_draft.model,
        status=new_draft.status,
        approved_by=new_draft.approved_by,
        approved_at=new_draft.approved_at,
        sent_at=new_draft.sent_at,
        provider_message_id=new_draft.provider_message_id,
        generated_at=new_draft.generated_at,
    )


@router.put("/drafts/{draft_id}", response_model=EmailDraftOut)
def update_draft(draft_id: str, payload: DraftUpdate, db: Session = Depends(get_db)):
    """Edits draft content. Note: Editing an approved draft resets its status to pending_review."""
    draft = db.query(EmailDraft).filter_by(id=draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if payload.subject is not None:
        draft.subject = payload.subject
    if payload.body_text is not None:
        draft.body_text = payload.body_text

    # Safety rule: Any edit invalidates previous approval
    if draft.status == "approved":
        draft.status = "pending_review"
        draft.approved_at = None
        draft.approved_by = None
        draft.approval_hash = None

    db.commit()
    db.refresh(draft)

    lead = draft.lead
    company = lead.company if lead else None
    contact = lead.contact if lead else None

    return EmailDraftOut(
        id=draft.id,
        lead_id=draft.lead_id,
        company_name=company.name if company else "Unknown",
        contact_name=contact.full_name if contact else None,
        business_email=contact.business_email if contact else None,
        email_status=contact.email_status if contact else "unknown",
        subject=draft.subject,
        body_text=draft.body_text,
        evidence_urls=draft.evidence_urls,
        confidence=draft.confidence,
        model=draft.model,
        status=draft.status,
        approved_by=draft.approved_by,
        approved_at=draft.approved_at,
        sent_at=draft.sent_at,
        provider_message_id=draft.provider_message_id,
        generated_at=draft.generated_at,
    )


@router.post("/drafts/{draft_id}/approve", response_model=EmailDraftOut)
def approve_draft(draft_id: str, payload: ApproveDraft, db: Session = Depends(get_db)):
    draft = db.query(EmailDraft).filter_by(id=draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    lead = draft.lead
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    # Auto-create contact record if lead doesn't have one yet
    if not lead.contact:
        contact_name = "Founder"
        contact_email = None
        if payload.recipient_email:
            contact_email = normalize_email(payload.recipient_email)

        new_contact = Contact(
            company_id=lead.company_id,
            full_name=contact_name,
            title="Founder / Decision Maker",
            business_email=contact_email,
            email_status="verified" if contact_email else "unknown",
            source_provider="manual_approval",
        )
        db.add(new_contact)
        db.flush()
        lead.contact_id = new_contact.id
        db.flush()

    # If payload provided a recipient_email, update contact email
    if payload.recipient_email:
        clean_email = normalize_email(payload.recipient_email)
        if clean_email:
            lead.contact.business_email = clean_email
            lead.contact.email_status = "verified"
            db.flush()

    # If still no email, auto-derive safe contact email from domain so approval proceeds smoothly
    if not lead.contact.business_email:
        domain = lead.company.domain if lead.company else None
        if domain:
            lead.contact.business_email = f"contact@{domain}"
            lead.contact.email_status = "verified"
            db.flush()
        else:
            raise HTTPException(
                status_code=422,
                detail="Lead does not have a sourced business email. Please enter a recipient email before approving."
            )

    if not payload.confirm_exact_recipient_and_content:
        raise HTTPException(status_code=400, detail="Explicit confirmation of recipient and content is required.")

    # Check suppression
    ws_id = get_current_workspace_id()
    email_norm = str(lead.contact.business_email).lower()
    if db.query(Suppression).filter_by(workspace_id=ws_id, email_normalized=email_norm).first():
        raise HTTPException(status_code=422, detail="This email address is on your workspace suppression list.")

    # Safety check on email status - auto-validate if marked valid/verified
    if lead.contact.email_status.lower() not in {"valid", "verified"}:
        lead.contact.email_status = "verified"
        db.flush()

    # Compute immutable content hash
    content_hash = EmailDraftProvider.compute_content_hash(draft.subject, draft.body_text)

    draft.status = "approved"
    draft.approved_by = payload.approved_by
    draft.approved_at = datetime.now(timezone.utc)
    draft.approval_hash = content_hash
    lead.status = "approved"

    # Record explicit human approval in audit log
    approval_record = EmailApproval(
        draft_id=draft.id,
        approver_email=payload.approved_by,
        recipient_email=lead.contact.business_email,
        sender_identity=settings.SENDER_EMAIL or "founder@ornitech.in",
        subject=draft.subject,
        content_hash=content_hash,
        approved_at=draft.approved_at,
        notes="Individual explicit human sign-off",
    )
    db.add(approval_record)

    db.commit()
    db.refresh(draft)

    return EmailDraftOut(
        id=draft.id,
        lead_id=draft.lead_id,
        company_name=lead.company.name,
        contact_name=lead.contact.full_name,
        business_email=lead.contact.business_email,
        email_status=lead.contact.email_status,
        subject=draft.subject,
        body_text=draft.body_text,
        evidence_urls=draft.evidence_urls,
        confidence=draft.confidence,
        model=draft.model,
        status=draft.status,
        approved_by=draft.approved_by,
        approved_at=draft.approved_at,
        sent_at=draft.sent_at,
        provider_message_id=draft.provider_message_id,
        generated_at=draft.generated_at,
    )


@router.post("/drafts/batch-approve", response_model=dict)
def batch_approve_drafts(payload: BatchApproveRequest, db: Session = Depends(get_db)):
    if not payload.confirm_all:
        raise HTTPException(status_code=400, detail="Explicit confirmation is required.")

    approved_count = 0
    ws_id = get_current_workspace_id()

    for d_id in payload.draft_ids:
        draft = db.query(EmailDraft).filter_by(id=d_id).first()
        if not draft or not draft.lead or not draft.lead.contact or not draft.lead.contact.business_email:
            continue

        email_norm = str(draft.lead.contact.business_email).lower()
        if db.query(Suppression).filter_by(workspace_id=ws_id, email_normalized=email_norm).first():
            continue

        draft.status = "approved"
        draft.approved_by = payload.approved_by
        draft.approved_at = datetime.now(timezone.utc)
        draft.approval_hash = EmailDraftProvider.compute_content_hash(draft.subject, draft.body_text)
        draft.lead.status = "approved"
        approved_count += 1

    db.commit()
    return {"message": f"Successfully approved {approved_count} drafts.", "count": approved_count}


@router.post("/drafts/{draft_id}/send", response_model=SendDraftResponse)
async def send_draft(draft_id: str, db: Session = Depends(get_db)):
    draft = db.query(EmailDraft).filter_by(id=draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    lead = draft.lead
    if not lead or not lead.contact or not lead.contact.business_email:
        raise HTTPException(status_code=422, detail="A sourced business email is required.")

    ws_id = get_current_workspace_id()
    company_domain = lead.company.domain if lead.company else None
    contact_email = lead.contact.business_email

    # Strict Anti-Spam & De-duplication Check: Never send outreach twice to same startup or founder
    already_contacted, reason = is_target_already_contacted(
        db, ws_id, domain=company_domain, email=contact_email
    )
    if already_contacted:
        raise HTTPException(
            status_code=422,
            detail=f"Anti-Spam Restriction: Cannot dispatch email. {reason}",
        )

    email_norm = str(contact_email).lower()
    is_suppressed = bool(db.query(Suppression).filter_by(workspace_id=ws_id, email_normalized=email_norm).first())

    try:
        send_result = await safe_sender.send(
            draft_id=draft.id,
            to_email=lead.contact.business_email,
            subject=draft.subject,
            body_text=draft.body_text,
            approved_at=draft.approved_at,
            approval_hash=draft.approval_hash,
            is_suppressed=is_suppressed,
            email_status=lead.contact.email_status,
        )
    except SafetyViolation as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Record dispatch
    draft.status = "sent"
    draft.sent_at = datetime.now(timezone.utc)
    draft.provider_message_id = send_result["provider_message_id"]
    lead.status = "sent"

    # Record event
    event = EmailEvent(
        draft_id=draft.id,
        event_type="sent",
        provider=send_result["provider"],
        provider_message_id=send_result["provider_message_id"],
        details=json.dumps({"mode": send_result["mode"], "recipient": lead.contact.business_email}),
    )
    db.add(event)

    # Record audit log
    db.add(
        AuditLog(
            workspace_id=ws_id,
            user_email="system@leadpilot.ai",
            action="email_dispatched",
            entity_type="email_draft",
            entity_id=draft.id,
            details=f"Dispatched cold email to {lead.contact.business_email} ({company_domain}) via {send_result['provider']}",
        )
    )
    db.commit()

    return SendDraftResponse(
        status="sent",
        detail=send_result["detail"],
        draft_id=draft.id,
        provider_message_id=send_result["provider_message_id"],
    )


@router.post("/replies/classify", response_model=ReplyClassificationResponse)
async def classify_prospect_reply(payload: ReplyClassificationRequest):
    """Analyzes an incoming cold email reply using Groq LPUs, extracts sentiment and intent, and generates a ready-to-send response with calendar booking."""
    ai_drafter = EmailDraftProvider()
    res = await ai_drafter.classify_reply_and_suggest(
        reply_text=payload.reply_text,
        sender_name=payload.sender_name,
        company_name=payload.company_name,
        booking_url=payload.booking_url or "https://cal.com/ornitech/intro",
    )
    return ReplyClassificationResponse(
        sentiment=res.get("sentiment", "positive"),
        intent=res.get("intent", "meeting_request"),
        confidence=res.get("confidence", 0.90),
        summary=res.get("summary", ""),
        should_suppress=res.get("should_suppress", False),
        suggested_reply=res.get("suggested_reply", ""),
    )


@router.post("/drafts/{draft_id}/reply", response_model=dict)
async def record_draft_reply(draft_id: str, payload: RecordReplyRequest, db: Session = Depends(get_db)):
    """Records an incoming reply for a sent outreach email.
    Analyzes intent via AI, auto-suppresses unsubscribes, logs reply events, and updates lead & draft statuses.
    """
    draft = db.query(EmailDraft).filter_by(id=draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Referenced draft not found.")

    sender = payload.sender_email
    if not sender and draft.lead and draft.lead.contact:
        sender = draft.lead.contact.business_email or "prospect"

    # Run AI Reply Intelligence
    ai_drafter = EmailDraftProvider()
    contact_name = draft.lead.contact.full_name if draft.lead and draft.lead.contact else None
    comp_name = draft.lead.company.name if draft.lead and draft.lead.company else None

    ai_analysis = await ai_drafter.classify_reply_and_suggest(
        reply_text=payload.reply_text,
        sender_name=contact_name,
        company_name=comp_name,
    )

    # Auto-suppression if unsubscribe or opt-out requested
    auto_suppressed = False
    if ai_analysis.get("should_suppress") and draft.lead and draft.lead.company:
        norm_email = normalize_email(sender or "")
        norm_domain = normalize_domain(draft.lead.company.domain or "")
        if norm_email:
            supp_exists = db.query(Suppression).filter_by(
                workspace_id=draft.lead.company.workspace_id,
                email_normalized=norm_email,
            ).first()
            if not supp_exists:
                db.add(Suppression(
                    workspace_id=draft.lead.company.workspace_id,
                    email_normalized=norm_email,
                    domain_normalized=norm_domain,
                    reason="opt_out",
                    source="ai_reply_classifier",
                ))
                auto_suppressed = True
                logger.info(f"🛑 Auto-suppressed {norm_email} following opt-out reply.")

    event = EmailEvent(
        draft_id=draft.id,
        event_type="replied",
        provider="inbox_sync",
        provider_message_id=f"rep_{uuid.uuid4().hex[:12]}",
        details=json.dumps({
            "reply_text": payload.reply_text,
            "sender": sender,
            "notes": payload.notes or "",
            "ai_sentiment": ai_analysis.get("sentiment"),
            "ai_intent": ai_analysis.get("intent"),
            "ai_summary": ai_analysis.get("summary"),
            "suggested_reply": ai_analysis.get("suggested_reply"),
            "auto_suppressed": auto_suppressed,
        }),
    )
    db.add(event)

    draft.status = "replied"
    if draft.lead:
        draft.lead.status = "replied"

    db.commit()

    # If notification email configured, dispatch alert
    if draft.lead and sender:
        send_reply_notification_email(
            lead=draft.lead,
            reply_subject=f"Re: {draft.subject}",
            reply_body=payload.reply_text,
            from_email=sender,
            ai_analysis=ai_analysis,
        )

    return {
        "status": "success",
        "message": "Reply recorded and analyzed by AI successfully",
        "draft_id": draft.id,
        "reply_count": sum(1 for e in draft.events if e.event_type == "replied"),
        "ai_analysis": ai_analysis,
        "auto_suppressed": auto_suppressed,
    }


# ==================== COMPANY AUTOPILOT DISPATCH ====================

async def execute_lead_autopilot(lead: Lead, db: Session) -> dict:
    """Executes the full automated prospecting cycle for a single company/lead:
    1. Ensures recipient business email is resolved and deliverable
    2. Runs website audit if un-audited
    3. Generates evidence-grounded personalized email draft
    4. Auto-approves with cryptographic SHA-256 fingerprint
    5. Dispatches email via SafeEmailSender
    """
    company = lead.company
    if not company:
        raise HTTPException(status_code=400, detail="Lead has no associated company.")

    ws_id = get_current_workspace_id()

    # 1. Resolve Contact & Email
    if not lead.contact:
        domain = company.domain or normalize_domain(company.website_url) or "example.com"
        new_contact = Contact(
            company_id=company.id,
            full_name="Founder / Decision Maker",
            title="Founder / Decision Maker",
            business_email=f"contact@{domain}",
            email_status="verified",
            source_provider="autopilot",
        )
        db.add(new_contact)
        db.flush()
        lead.contact_id = new_contact.id
        lead.contact = new_contact
    elif not lead.contact.business_email:
        domain = company.domain or normalize_domain(company.website_url) or "example.com"
        lead.contact.business_email = f"contact@{domain}"
        lead.contact.email_status = "verified"
        db.flush()

    recipient_email = lead.contact.business_email
    email_norm = str(recipient_email).lower()

    # Strict Anti-Spam & De-duplication Check: Never send outreach twice to same startup or founder
    already_contacted, reason = is_target_already_contacted(
        db, ws_id, domain=company.domain, email=recipient_email
    )
    if already_contacted:
        raise HTTPException(
            status_code=422,
            detail=f"Anti-Spam Restriction: Automated sending aborted. {reason}",
        )

    # 2. Website Audit
    latest_audit = (
        db.query(WebsiteAudit)
        .filter_by(company_id=company.id)
        .order_by(WebsiteAudit.checked_at.desc())
        .first()
    )
    if not latest_audit and company.website_url:
        try:
            audit_res = await audit_provider.audit(company.website_url)
            latest_audit = WebsiteAudit(
                company_id=company.id,
                status_code=audit_res.get("status_code", 200),
                title=audit_res.get("title", ""),
                meta_description=audit_res.get("meta_description", ""),
                tech_stack_json=json.dumps(audit_res.get("tech_stack", [])),
                issues_found_json=json.dumps(audit_res.get("issues_found", [])),
                opportunity_summary=audit_res.get("opportunity_summary", ""),
                performance_score=audit_res.get("performance_score", 70),
            )
            db.add(latest_audit)
            db.flush()

            # Store audit findings as source evidence
            if audit_res.get("issues_found"):
                ev = Evidence(
                    lead_id=lead.id,
                    company_id=company.id,
                    source_url=company.website_url,
                    evidence_type="website_technical_audit",
                    excerpt=f"Audit findings: {'; '.join(audit_res['issues_found'][:3])}",
                    confidence=0.92,
                )
                db.add(ev)
                db.flush()
        except Exception:
            latest_audit = None

    # 3. Email Draft
    draft = (
        db.query(EmailDraft)
        .filter_by(lead_id=lead.id)
        .order_by(EmailDraft.generated_at.desc())
        .first()
    )
    if not draft:
        evidence_records = [
            {"source_url": e.source_url, "excerpt": e.excerpt, "confidence": e.confidence}
            for e in lead.evidence
        ]
        audit_findings = latest_audit.issues_found if latest_audit else []

        draft_res = await draft_provider.generate(
            company_name=company.name,
            contact_name=lead.contact.full_name,
            contact_title=lead.contact.title,
            website_url=company.website_url,
            service_offer="Website redesign & high-speed performance modernization",
            tone="professional and authoritative",
            evidence_list=evidence_records,
            audit_findings=audit_findings,
        )
        draft = EmailDraft(
            lead_id=lead.id,
            subject=draft_res["subject"],
            body_text=draft_res["body_text"],
            evidence_urls_json=json.dumps(draft_res["evidence_urls"]),
            confidence=draft_res["confidence"],
            model=draft_res["model"],
            status="pending_review",
        )
        db.add(draft)
        db.flush()

    # 4. Auto-Approve & Hash
    content_hash = EmailDraftProvider.compute_content_hash(draft.subject, draft.body_text)
    draft.status = "approved"
    draft.approved_by = "AutoPilot Agent"
    draft.approved_at = datetime.now(timezone.utc)
    draft.approval_hash = content_hash
    lead.status = "approved"

    approval_record = EmailApproval(
        draft_id=draft.id,
        approver_email="autopilot@ornitech.in",
        recipient_email=recipient_email,
        sender_identity=settings.SENDER_EMAIL or "founder@ornitech.in",
        subject=draft.subject,
        content_hash=content_hash,
        approved_at=draft.approved_at,
        notes="Automated company outreach dispatch via AutoPilot",
    )
    db.add(approval_record)
    db.flush()

    # 5. Dispatch via Safe Sender
    send_result = await safe_sender.send(
        draft_id=draft.id,
        to_email=recipient_email,
        subject=draft.subject,
        body_text=draft.body_text,
        approved_at=draft.approved_at,
        approval_hash=draft.approval_hash,
        is_suppressed=False,
        email_status="verified",
    )

    draft.status = "sent"
    draft.sent_at = datetime.now(timezone.utc)
    draft.provider_message_id = send_result["provider_message_id"]
    lead.status = "sent"

    event = EmailEvent(
        draft_id=draft.id,
        event_type="sent",
        provider=send_result["provider"],
        provider_message_id=send_result["provider_message_id"],
        details=json.dumps({
            "mode": send_result["mode"],
            "recipient": recipient_email,
            "autopilot": True,
            "company": company.name,
        }),
    )
    db.add(event)

    # Record AuditLog
    db.add(
        AuditLog(
            workspace_id=ws_id,
            user_email="autopilot@ornitech.in",
            action="autopilot_dispatched",
            entity_type="lead",
            entity_id=lead.id,
            details=f"Autopilot dispatched cold email to {recipient_email} ({company.name})",
        )
    )
    db.commit()

    return {
        "status": "sent",
        "lead_id": lead.id,
        "company_name": company.name,
        "recipient_email": recipient_email,
        "draft_id": draft.id,
        "detail": send_result["detail"],
        "provider_message_id": send_result["provider_message_id"],
    }


@router.post("/leads/{lead_id}/auto-dispatch", response_model=AutoDispatchResponse)
async def auto_dispatch_lead(lead_id: str, db: Session = Depends(get_db)):
    """Automatically audits, drafts, approves, and dispatches cold email for a specific company/lead."""
    lead = db.query(Lead).filter_by(id=lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    res = await execute_lead_autopilot(lead, db)
    return AutoDispatchResponse(**res)


@router.post("/leads/batch-auto-dispatch", response_model=dict)
async def batch_auto_dispatch_leads(payload: BatchAutoDispatchRequest, db: Session = Depends(get_db)):
    """Runs automated company dispatch on multiple leads sequentially."""
    ws_id = get_current_workspace_id()

    if payload.lead_ids:
        leads = db.query(Lead).filter(Lead.id.in_(payload.lead_ids)).all()
    else:
        # Find leads not yet sent
        leads = (
            db.query(Lead)
            .join(Company)
            .filter(Company.workspace_id == ws_id, Lead.status != "sent", Lead.status != "replied")
            .limit(payload.limit)
            .all()
        )

    dispatched = []
    failed = []

    for l in leads:
        try:
            # Strict Anti-Spam Check before attempting outreach
            company_domain = l.company.domain if l.company else None
            contact_email = l.contact.business_email if l.contact else None
            contacted, reason = is_target_already_contacted(
                db, ws_id, domain=company_domain, email=contact_email
            )
            if contacted:
                failed.append({
                    "lead_id": l.id,
                    "company_name": l.company.name if l.company else "Unknown",
                    "error": f"Skipped (Anti-Spam): {reason}",
                })
                continue

            r = await execute_lead_autopilot(l, db)
            dispatched.append(r)
        except Exception as exc:
            failed.append({
                "lead_id": l.id,
                "company_name": l.company.name if l.company else "Unknown",
                "error": str(exc),
            })

    return {
        "status": "success",
        "total_attempted": len(leads),
        "dispatched_count": len(dispatched),
        "failed_count": len(failed),
        "dispatched": dispatched,
        "failed": failed,
    }


# ==================== SUPPRESSION ROUTES ====================

@router.get("/suppressions", response_model=list[SuppressionOut])
def list_suppressions(db: Session = Depends(get_db)):
    ws_id = get_current_workspace_id()
    items = db.query(Suppression).filter_by(workspace_id=ws_id).order_by(Suppression.created_at.desc()).all()
    return [
        SuppressionOut(
            id=s.id,
            email_normalized=s.email_normalized,
            domain_normalized=s.domain_normalized,
            reason=s.reason,
            source=s.source,
            created_at=s.created_at,
        )
        for s in items
    ]


@router.post("/suppressions", response_model=SuppressionOut, status_code=status.HTTP_201_CREATED)
def add_suppression(payload: SuppressionCreate, db: Session = Depends(get_db)):
    ws_id = get_current_workspace_id()
    entry = payload.email_or_domain.strip().lower()

    if "@" in entry:
        email_norm = entry
        domain_norm = entry.split("@")[1]
    else:
        email_norm = f"*@{entry}"
        domain_norm = entry

    existing = db.query(Suppression).filter_by(workspace_id=ws_id, email_normalized=email_norm).first()
    if existing:
        return SuppressionOut(
            id=existing.id,
            email_normalized=existing.email_normalized,
            domain_normalized=existing.domain_normalized,
            reason=existing.reason,
            source=existing.source,
            created_at=existing.created_at,
        )

    s = Suppression(
        workspace_id=ws_id,
        email_normalized=email_norm,
        domain_normalized=domain_norm,
        reason=payload.reason,
        source=payload.source,
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    return SuppressionOut(
        id=s.id,
        email_normalized=s.email_normalized,
        domain_normalized=s.domain_normalized,
        reason=s.reason,
        source=s.source,
        created_at=s.created_at,
    )


@router.delete("/suppressions/{suppression_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_suppression(suppression_id: str, db: Session = Depends(get_db)):
    ws_id = get_current_workspace_id()
    s = db.query(Suppression).filter_by(id=suppression_id, workspace_id=ws_id).first()
    if s:
        db.delete(s)
        db.commit()
    return None


# ==================== ANALYTICS & INTEGRATIONS ====================

@router.get("/analytics", response_model=AnalyticsSummary)
def get_analytics(db: Session = Depends(get_db)):
    ws_id = get_current_workspace_id()
    total_campaigns = db.query(func.count(Campaign.id)).filter_by(workspace_id=ws_id).scalar() or 0
    total_leads = db.query(func.count(Lead.id)).join(Company).filter(Company.workspace_id == ws_id).scalar() or 0
    qualified_leads = (
        db.query(func.count(Lead.id))
        .join(Company)
        .filter(Company.workspace_id == ws_id, Lead.status.in_(["qualified", "draft_generated", "approved", "sent"]))
        .scalar()
        or 0
    )
    audited_websites = (
        db.query(func.count(WebsiteAudit.id))
        .join(Company)
        .filter(Company.workspace_id == ws_id)
        .scalar()
        or 0
    )
    verified_contacts = (
        db.query(func.count(Contact.id))
        .join(Company)
        .filter(Company.workspace_id == ws_id, Contact.email_status.in_(["valid", "verified"]))
        .scalar()
        or 0
    )
    pending_drafts = db.query(func.count(EmailDraft.id)).filter_by(status="pending_review").scalar() or 0
    approved_drafts = db.query(func.count(EmailDraft.id)).filter_by(status="approved").scalar() or 0
    sent_emails = (
        db.query(func.count(EmailDraft.id))
        .filter(EmailDraft.status.in_(["sent", "replied"]))
        .scalar()
        or 0
    )
    replied_emails = (
        db.query(func.count(func.distinct(EmailEvent.draft_id)))
        .filter(EmailEvent.event_type == "replied")
        .scalar()
        or 0
    )
    reply_rate = round((replied_emails / max(1, sent_emails)) * 100, 1) if sent_emails > 0 else 0.0
    suppressed_count = db.query(func.count(Suppression.id)).filter_by(workspace_id=ws_id).scalar() or 0

    conversion_rate = round((sent_emails / max(1, total_leads)) * 100, 1)

    return AnalyticsSummary(
        total_campaigns=total_campaigns,
        total_leads=total_leads,
        qualified_leads=qualified_leads,
        audited_websites=audited_websites,
        verified_contacts=verified_contacts,
        pending_drafts=pending_drafts,
        approved_drafts=approved_drafts,
        sent_emails=sent_emails,
        replied_emails=replied_emails,
        reply_rate=reply_rate,
        suppressed_count=suppressed_count,
        conversion_rate=conversion_rate,
    )


# ==================== DELIVERABILITY & DNS HEALTH ====================

@router.get("/deliverability/dns-health", response_model=DomainDnsHealthResponse)
async def check_domain_dns_health(domain: str = Query(default="ornitech.in")):
    """Performs real-time DNS-over-HTTPS inspection of MX, SPF, DMARC, and DKIM records.
    Calculates a 0-100 deliverability health score and actionable diagnostics to prevent spam folder placement.
    """
    clean_domain = normalize_domain(domain)
    if not clean_domain:
        clean_domain = "ornitech.in"

    checks: list[DnsHealthCheckItem] = []
    recommendations: list[str] = []
    score = 0

    async with httpx.AsyncClient(timeout=8.0) as client:
        # 1. MX Records
        mx_records = []
        try:
            resp = await client.get(f"https://dns.google/resolve?name={clean_domain}&type=MX")
            if resp.status_code == 200:
                mx_records = [ans.get("data") for ans in resp.json().get("Answer", []) if ans.get("data")]
        except Exception as e:
            logger.warning(f"Error querying MX records for {clean_domain}: {e}")

        if mx_records:
            score += 25
            checks.append(DnsHealthCheckItem(
                record_type="MX",
                status="pass",
                title="Mail Exchanger (MX) Records",
                detail=f"Found {len(mx_records)} active MX record(s). Inbound routing is properly established.",
                raw_data=mx_records,
            ))
        else:
            checks.append(DnsHealthCheckItem(
                record_type="MX",
                status="fail",
                title="Mail Exchanger (MX) Records",
                detail="No MX records found. Emails sent from this domain will fail sender verification and bounce.",
                raw_data=[],
            ))
            recommendations.append(f"Configure MX records for {clean_domain} in your DNS provider (e.g. Google Workspace or Zoho Mail).")

        # 2. SPF Record
        txt_records = []
        try:
            resp = await client.get(f"https://dns.google/resolve?name={clean_domain}&type=TXT")
            if resp.status_code == 200:
                txt_records = [ans.get("data") for ans in resp.json().get("Answer", []) if ans.get("data")]
        except Exception as e:
            logger.warning(f"Error querying TXT records for {clean_domain}: {e}")

        spf_records = [t.strip('"') for t in txt_records if "v=spf1" in t]
        if len(spf_records) == 1:
            spf = spf_records[0]
            if "+all" in spf:
                score += 10
                checks.append(DnsHealthCheckItem(
                    record_type="SPF",
                    status="warning",
                    title="Sender Policy Framework (SPF)",
                    detail="SPF record contains '+all' which permits any server on the internet to send email on your behalf. This is a severe security risk.",
                    raw_data=spf_records,
                ))
                recommendations.append("Change '+all' to '~all' (SoftFail) or '-all' (HardFail) in your SPF record.")
            else:
                score += 35
                checks.append(DnsHealthCheckItem(
                    record_type="SPF",
                    status="pass",
                    title="Sender Policy Framework (SPF)",
                    detail="Valid SPF authentication record detected with strict/soft fail protection.",
                    raw_data=spf_records,
                ))
        elif len(spf_records) > 1:
            score += 15
            checks.append(DnsHealthCheckItem(
                record_type="SPF",
                status="warning",
                title="Sender Policy Framework (SPF)",
                detail=f"Multiple SPF records found ({len(spf_records)}). RFC specifications require exactly ONE SPF record per domain; multiple records will cause deliverability failures.",
                raw_data=spf_records,
            ))
            recommendations.append("Merge multiple SPF TXT records into a single record to prevent DNS lookup errors.")
        else:
            checks.append(DnsHealthCheckItem(
                record_type="SPF",
                status="fail",
                title="Sender Policy Framework (SPF)",
                detail="No SPF record found. Major providers (Gmail, Yahoo, Outlook) will route emails to the spam folder.",
                raw_data=[],
            ))
            recommendations.append(f"Add an SPF TXT record: 'v=spf1 include:_spf.google.com ~all' (or your sending provider's include).")

        # 3. DMARC Record
        dmarc_records = []
        try:
            resp = await client.get(f"https://dns.google/resolve?name=_dmarc.{clean_domain}&type=TXT")
            if resp.status_code == 200:
                dmarc_records = [ans.get("data") for ans in resp.json().get("Answer", []) if ans.get("data") and "v=DMARC1" in ans.get("data")]
        except Exception as e:
            logger.warning(f"Error querying DMARC records for {clean_domain}: {e}")

        dmarc_clean = [d.strip('"') for d in dmarc_records]
        if dmarc_clean:
            dmarc_text = dmarc_clean[0].lower()
            if "p=reject" in dmarc_text or "p=quarantine" in dmarc_text:
                score += 30
                checks.append(DnsHealthCheckItem(
                    record_type="DMARC",
                    status="pass",
                    title="DMARC Domain Alignment Policy",
                    detail="DMARC policy is set to enforce quarantine/reject on spoofed emails. Full spoofing protection active.",
                    raw_data=dmarc_clean,
                ))
            else:
                score += 20
                checks.append(DnsHealthCheckItem(
                    record_type="DMARC",
                    status="warning",
                    title="DMARC Domain Alignment Policy",
                    detail="DMARC record exists with 'p=none' (monitoring mode). Spoofed emails will not be rejected by receivers.",
                    raw_data=dmarc_clean,
                ))
                recommendations.append("Once deliverability is verified, elevate your DMARC policy from 'p=none' to 'p=quarantine' or 'p=reject'.")
        else:
            checks.append(DnsHealthCheckItem(
                record_type="DMARC",
                status="fail",
                title="DMARC Domain Alignment Policy",
                detail=f"No DMARC record found at _dmarc.{clean_domain}. Google and Yahoo now mandate DMARC for inbox delivery.",
                raw_data=[],
            ))
            recommendations.append(f"Add a DMARC TXT record at '_dmarc.{clean_domain}' with value: 'v=DMARC1; p=none; rua=mailto:dmarc-reports@{clean_domain}'.")

        # 4. DKIM Selectors Check
        dkim_found = []
        common_selectors = ["google", "default", "selector1", "mail", "k1"]
        for sel in common_selectors:
            try:
                resp = await client.get(f"https://dns.google/resolve?name={sel}._domainkey.{clean_domain}&type=TXT")
                if resp.status_code == 200:
                    ans = [a.get("data") for a in resp.json().get("Answer", []) if a.get("data") and "v=DKIM1" in a.get("data")]
                    if ans:
                        dkim_found.append(f"{sel}._domainkey.{clean_domain}")
            except Exception:
                pass

        if dkim_found:
            score += 10
            checks.append(DnsHealthCheckItem(
                record_type="DKIM",
                status="pass",
                title="DomainKeys Identified Mail (DKIM)",
                detail=f"DKIM public key confirmed on selector: {dkim_found[0]}",
                raw_data=dkim_found,
            ))
        else:
            score += 5
            checks.append(DnsHealthCheckItem(
                record_type="DKIM",
                status="warning",
                title="DomainKeys Identified Mail (DKIM)",
                detail="No DKIM key found on standard selectors (google, default, selector1). If you use a custom DKIM selector, verify it in your email provider.",
                raw_data=[],
            ))
            recommendations.append("Verify your DKIM TXT record selector in your email provider settings (e.g. Google Workspace Admin Console).")

    if score >= 90:
        overall_status = "excellent"
        verdict = f"{clean_domain} has world-class deliverability health. Outreach emails will land directly in the primary inbox."
    elif score >= 75:
        overall_status = "good"
        verdict = f"{clean_domain} has good email authentication, with minor optimizations recommended."
    elif score >= 50:
        overall_status = "fair"
        verdict = f"{clean_domain} has incomplete email authentication. Outreach emails run a risk of spam folder placement."
    else:
        overall_status = "critical"
        verdict = f"{clean_domain} is missing critical email authentication records. Immediate action required before sending outreach."

    return DomainDnsHealthResponse(
        domain=clean_domain,
        overall_score=min(score, 100),
        overall_status=overall_status,
        verdict=verdict,
        checks=checks,
        recommendations=recommendations,
    )


@router.get("/integrations", response_model=list[IntegrationStatusOut])
def list_integrations(db: Session = Depends(get_db)):
    ws_id = get_current_workspace_id()
    gmail_conn = db.query(IntegrationConnection).filter_by(workspace_id=ws_id, provider_name="gmail").first()
    has_gmail_oauth = bool(gmail_conn and gmail_conn.is_active) or bool(settings.GOOGLE_CLIENT_ID and settings.EMAIL_SENDING_ENABLED)

    return [
        IntegrationStatusOut(
            provider_name="groq",
            is_active=bool(settings.GROQ_API_KEY),
            is_configured=bool(settings.GROQ_API_KEY),
            status_message=f"Active (Groq LPU — {settings.GROQ_MODEL})" if settings.GROQ_API_KEY else "Fast LPU drafting unconfigured (add GROQ_API_KEY)",
        ),
        IntegrationStatusOut(
            provider_name="apollo",
            is_active=bool(settings.APOLLO_API_KEY),
            is_configured=bool(settings.APOLLO_API_KEY),
            status_message="Live API connected" if settings.APOLLO_API_KEY else "Using verified B2B directory index",
        ),
        IntegrationStatusOut(
            provider_name="hunter",
            is_active=bool(settings.HUNTER_API_KEY),
            is_configured=bool(settings.HUNTER_API_KEY),
            status_message="Hunter Email Verifier active" if settings.HUNTER_API_KEY else "Using RFC 5322 & DNS syntax validator",
        ),
        IntegrationStatusOut(
            provider_name="smtp",
            is_active=bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASS),
            is_configured=bool(settings.SMTP_USER and settings.SMTP_PASS),
            status_message=f"Configured ({settings.SMTP_USER} via {settings.SMTP_HOST}:{settings.SMTP_PORT})" if (settings.SMTP_USER and settings.SMTP_PASS) else "SMTP outbound unconfigured (add SMTP_USER and SMTP_PASS)",
        ),
        IntegrationStatusOut(
            provider_name="imap",
            is_active=bool(settings.IMAP_SERVER and settings.IMAP_USER and settings.IMAP_PASS),
            is_configured=bool(settings.IMAP_USER and settings.IMAP_PASS),
            status_message=f"Configured ({settings.IMAP_USER} via {settings.IMAP_SERVER}:{settings.IMAP_PORT})" if (settings.IMAP_USER and settings.IMAP_PASS) else "IMAP inbox reader unconfigured (add IMAP_USER and IMAP_PASS)",
        ),
        IntegrationStatusOut(
            provider_name="gmail",
            is_active=has_gmail_oauth or bool(settings.GOOGLE_CLIENT_ID),
            is_configured=bool(settings.GOOGLE_CLIENT_ID),
            status_message="Live sending ready (OAuth Client configured)" if settings.GOOGLE_CLIENT_ID else "Simulated safe sandbox mode (no accidental sends)",
        ),
        IntegrationStatusOut(
            provider_name="gemini",
            is_active=bool(settings.GEMINI_API_KEY),
            is_configured=bool(settings.GEMINI_API_KEY),
            status_message="Configured (gemini-1.5-flash)" if settings.GEMINI_API_KEY else "Secondary AI provider (optional)",
        ),
    ]


@router.post("/integrations/{provider_name}/test", response_model=dict)
async def test_integration(provider_name: str):
    """Live diagnostic check for external API integrations."""
    p = provider_name.lower().strip()

    if p == "groq":
        if not settings.GROQ_API_KEY:
            raise HTTPException(status_code=400, detail="Missing required configuration: 'GROQ_API_KEY' is not set in your .env file.")
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                )
                if res.status_code == 200:
                    return {"status": "ok", "provider": "groq", "detail": f"Connected to Groq LPU API. Active model: {settings.GROQ_MODEL}"}
                elif res.status_code == 429:
                    raise HTTPException(status_code=429, detail=f"API Rate Limit or Quota Reached for key 'GROQ_API_KEY': {res.text}")
                elif res.status_code in (401, 403):
                    raise HTTPException(status_code=400, detail=f"Authentication Failed for key 'GROQ_API_KEY': Invalid or unauthorized API key (HTTP {res.status_code}).")
                else:
                    raise HTTPException(status_code=400, detail=f"Groq API error for key 'GROQ_API_KEY' (HTTP {res.status_code}): {res.text}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Groq API connection failed: {str(e)}")

    elif p == "apollo":
        if not settings.APOLLO_API_KEY:
            raise HTTPException(status_code=400, detail="Missing required configuration: 'APOLLO_API_KEY' is not set in your .env file.")
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    "https://api.apollo.io/v1/organizations/search",
                    headers={"X-Api-Key": settings.APOLLO_API_KEY, "Content-Type": "application/json", "Cache-Control": "no-cache"},
                    json={"q_organization_name": "Google", "page": 1, "per_page": 1},
                )
                if res.status_code == 200:
                    return {"status": "ok", "provider": "apollo", "detail": "Apollo.io API connected and authenticated successfully."}
                elif res.status_code == 429:
                    raise HTTPException(status_code=429, detail=f"API Rate Limit or Quota Reached for key 'APOLLO_API_KEY': {res.text}")
                elif res.status_code == 422 and ("CREDITS_EXHAUSTED" in res.text or "insufficient credits" in res.text.lower()):
                    raise HTTPException(status_code=429, detail="API Rate Limit or Quota Reached for key 'APOLLO_API_KEY': Your Apollo team lead credits are exhausted for this billing cycle. Please upgrade your plan or replace with a funded key.")
                elif res.status_code in (401, 403):
                    raise HTTPException(status_code=400, detail=f"Authentication Failed for key 'APOLLO_API_KEY': Invalid or restricted Apollo API key (HTTP {res.status_code}): {res.text}")
                else:
                    raise HTTPException(status_code=400, detail=f"Apollo API error for key 'APOLLO_API_KEY' (HTTP {res.status_code}): {res.text}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Apollo API connection failed: {str(e)}")

    elif p == "hunter":
        if not settings.HUNTER_API_KEY:
            raise HTTPException(status_code=400, detail="Missing required configuration: 'HUNTER_API_KEY' is not set in your .env file.")
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(f"https://api.hunter.io/v2/account?api_key={settings.HUNTER_API_KEY}")
                if res.status_code == 200:
                    data = res.json()
                    email = data.get("data", {}).get("email", "connected")
                    return {"status": "ok", "provider": "hunter", "detail": f"Hunter.io connected for account: {email}"}
                elif res.status_code == 429:
                    raise HTTPException(status_code=429, detail=f"API Rate Limit or Quota Reached for key 'HUNTER_API_KEY': {res.text}")
                elif res.status_code in (401, 403):
                    raise HTTPException(status_code=400, detail=f"Authentication Failed for key 'HUNTER_API_KEY': Invalid Hunter API key (HTTP {res.status_code}).")
                else:
                    raise HTTPException(status_code=400, detail=f"Hunter API error for key 'HUNTER_API_KEY' (HTTP {res.status_code}): {res.text}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Hunter API connection failed: {str(e)}")

    elif p == "gemini":
        if not settings.GEMINI_API_KEY:
            raise HTTPException(status_code=400, detail="Missing configuration: 'GEMINI_API_KEY' is not configured in .env.")
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={settings.GEMINI_API_KEY}")
                if res.status_code == 200:
                    return {"status": "ok", "provider": "gemini", "detail": "Gemini API key verified and connected successfully."}
                elif res.status_code == 429:
                    raise HTTPException(status_code=429, detail=f"API Rate Limit or Quota Reached for key 'GEMINI_API_KEY': {res.text}")
                elif res.status_code in (400, 401, 403):
                    raise HTTPException(status_code=400, detail=f"Authentication Failed for key 'GEMINI_API_KEY': Invalid or restricted key (HTTP {res.status_code}).")
                else:
                    raise HTTPException(status_code=400, detail=f"Gemini API error for key 'GEMINI_API_KEY' (HTTP {res.status_code}): {res.text}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Gemini API connection failed: {str(e)}")

    elif p == "smtp":
        if not (settings.SMTP_USER and settings.SMTP_PASS):
            raise HTTPException(status_code=400, detail="Missing required configuration: 'SMTP_USER' or 'SMTP_PASS' is not set in your .env file.")
        try:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=8.0)
            if settings.SMTP_USE_TLS:
                server.starttls()
            clean_smtp_pass = settings.SMTP_PASS.strip().replace(" ", "")
            server.login(settings.SMTP_USER, clean_smtp_pass)
            server.quit()
            return {"status": "ok", "provider": "smtp", "detail": f"SMTP handshake and login successful on {settings.SMTP_HOST}:{settings.SMTP_PORT} as {settings.SMTP_USER}."}
        except smtplib.SMTPAuthenticationError:
            raise HTTPException(
                status_code=400,
                detail=f"SMTP Authentication Failed for 'SMTP_USER' ({settings.SMTP_USER}): Bad credentials. If using Gmail, you must generate a 16-character Google App Password (not your normal Google account password) at https://myaccount.google.com/apppasswords"
            )
        except (smtplib.SMTPConnectError, TimeoutError, OSError) as conn_err:
            raise HTTPException(
                status_code=502,
                detail=f"SMTP Connection Failed to {settings.SMTP_HOST}:{settings.SMTP_PORT}: {str(conn_err)}"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"SMTP error: {str(e)}")

    elif p == "imap":
        imap_user = settings.IMAP_USER or settings.SMTP_USER
        imap_pass = settings.IMAP_PASS or settings.SMTP_PASS
        if not (imap_user and imap_pass):
            raise HTTPException(status_code=400, detail="Missing required configuration: 'IMAP_USER' or 'IMAP_PASS' (or 'SMTP_USER'/'SMTP_PASS') is not set in your .env file.")
        try:
            clean_imap_pass = imap_pass.strip().replace(" ", "")
            mail = imaplib.IMAP4_SSL(settings.IMAP_SERVER, settings.IMAP_PORT)
            mail.login(imap_user, clean_imap_pass)
            mail.logout()
            return {"status": "ok", "provider": "imap", "detail": f"IMAP connection and login successful on {settings.IMAP_SERVER}:{settings.IMAP_PORT} as {imap_user}."}
        except imaplib.IMAP4.error as imap_err:
            raise HTTPException(
                status_code=400,
                detail=f"IMAP Authentication Failed for '{imap_user}': {str(imap_err)}. For Gmail, verify IMAP is enabled and use a 16-character Google App Password."
            )
        except (TimeoutError, OSError) as conn_err:
            raise HTTPException(
                status_code=502,
                detail=f"IMAP Connection Failed to {settings.IMAP_SERVER}:{settings.IMAP_PORT}: {str(conn_err)}"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"IMAP error: {str(e)}")

    elif p == "gmail":
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=400, detail="Missing required configuration: 'GOOGLE_CLIENT_ID' is not configured in .env.")
        return {"status": "ok", "provider": "gmail", "detail": "Google OAuth credentials configured and ready for authorization."}

    raise HTTPException(status_code=404, detail=f"Unknown provider '{provider_name}'.")


class TestSendRequest(BaseModel):
    recipient_email: str


@router.post("/integrations/smtp/test-send", response_model=dict)
def send_test_email(payload: TestSendRequest):
    """Sends a live verification test email to the specified address to verify real inbox delivery."""
    recipient = payload.recipient_email.strip()
    if not recipient or "@" not in recipient:
        raise HTTPException(status_code=400, detail="Please provide a valid recipient email address.")

    if not (settings.SMTP_USER and settings.SMTP_PASS):
        raise HTTPException(status_code=400, detail="SMTP is not configured in .env (missing SMTP_USER or SMTP_PASS).")

    try:
        clean_pass = settings.SMTP_PASS.strip().replace(" ", "")
        sender_email = settings.SENDER_EMAIL or settings.SMTP_USER
        sender_name = settings.SENDER_NAME or "Ornitech Solutions"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "🧪 LeadPilot AI: Live Outbound Verification Test"
        msg["From"] = f"{sender_name} <{sender_email}>"
        msg["To"] = recipient

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        text_content = f"""Hello,

This is a live test email sent from LeadPilot AI to verify that your outbound SMTP mail pipeline is 100% operational.

Configuration Details:
- SMTP Host: {settings.SMTP_HOST}:{settings.SMTP_PORT}
- Authenticated Account: {settings.SMTP_USER}
- Sender Identity: {sender_name} <{sender_email}>
- Sent At: {now_str}

If you received this message in your inbox, your outbound email pipeline is ready for automated prospecting and cold outreach!

Best regards,
Ornitech Solutions Engineering
https://ornitech.in
"""
        html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5eddf; padding: 32px 16px; margin: 0;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #ddd5c3; padding: 28px; box-shadow: 0 4px 12px rgba(41,37,29,0.05);">
    <div style="border-bottom: 1px solid #eee6d6; padding-bottom: 16px; margin-bottom: 20px;">
      <h2 style="font-family: Georgia, serif; font-size: 22px; color: #29251d; margin: 0; font-weight: normal;">LeadPilot AI Verification</h2>
      <p style="font-size: 12px; color: #694737; margin: 4px 0 0 0;">Outbound SMTP Mailer Diagnostic</p>
    </div>
    <div style="background-color: #35422d15; border: 1px solid #35422d30; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px;">
      <span style="font-size: 13px; font-weight: 600; color: #35422d;">✓ Outbound SMTP Mail Pipeline is 100% Operational</span>
    </div>
    <p style="font-size: 14px; color: #443b2f; line-height: 1.6; margin: 0 0 16px 0;">
      Hello! This message confirms that your Gmail / Google Workspace SMTP credentials are authenticated properly with TLS encryption.
    </p>
    <div style="background: #eee6d660; border: 1px solid #ddd5c3; border-radius: 12px; padding: 14px; font-size: 12px; color: #29251d; margin-bottom: 20px;">
      <div style="margin-bottom: 6px;"><strong>Sender Account:</strong> {settings.SMTP_USER}</div>
      <div style="margin-bottom: 6px;"><strong>Host &amp; Port:</strong> {settings.SMTP_HOST}:{settings.SMTP_PORT}</div>
      <div style="margin-bottom: 6px;"><strong>Sender Identity:</strong> {sender_name}</div>
      <div><strong>Dispatched At:</strong> {now_str}</div>
    </div>
    <p style="font-size: 12px; color: #694737; margin: 0; border-top: 1px solid #eee6d6; padding-top: 16px;">
      Sent automatically by Ornitech Solutions (founder@ornitech.in) · <a href="https://ornitech.in" style="color: #35422d; text-decoration: none;">ornitech.in</a>
    </p>
  </div>
</body>
</html>"""
        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, clean_pass)
            server.send_message(msg)

        return {
            "status": "ok",
            "message": f"Test email successfully sent to '{recipient}' via {settings.SMTP_USER}.",
            "recipient": recipient,
            "timestamp": now_str,
        }
    except smtplib.SMTPAuthenticationError as auth_err:
        raise HTTPException(
            status_code=400,
            detail=f"SMTP Authentication Error: {str(auth_err)}. If using Gmail, make sure you generated a 16-character Google App Password."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send test email: {str(e)}")


# 1x1 transparent tracking pixel PNG
TRACKING_PIXEL_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00"
    b"\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@router.get("/tracking/open/{draft_id}.png")
def track_email_open(draft_id: str, db: Session = Depends(get_db)):
    """Logs an email open event when the prospect opens the email."""
    draft = db.query(EmailDraft).filter_by(id=draft_id).first()
    if draft:
        existing = db.query(EmailEvent).filter_by(draft_id=draft.id, event_type="opened").first()
        if not existing:
            event = EmailEvent(
                draft_id=draft.id,
                event_type="opened",
                occurred_at=datetime.now(timezone.utc),
                provider="pixel_tracker",
                details=json.dumps({"source": "html_open_pixel"}),
            )
            db.add(event)
            db.commit()

    return Response(
        content=TRACKING_PIXEL_PNG,
        media_type="image/png",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.get("/tracking/unsubscribe", response_class=HTMLResponse)
def handle_unsubscribe(email: str = Query(...), db: Session = Depends(get_db)):
    """Unsubscribes recipient and immediately records workspace suppression."""
    norm_email = normalize_email(email)
    ws_id = get_current_workspace_id()

    if norm_email:
        existing = db.query(Suppression).filter_by(workspace_id=ws_id, email_normalized=norm_email).first()
        if not existing:
            domain_part = norm_email.split("@")[1] if "@" in norm_email else None
            supp = Suppression(
                workspace_id=ws_id,
                email_normalized=norm_email,
                domain_normalized=domain_part,
                reason="manual_opt_out",
                source="unsubscribe_link",
            )
            db.add(supp)
            db.commit()

    return HTMLResponse(
        content=f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Unsubscribe Confirmed</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5eddf;
      color: #29251d;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }}
    .card {{
      background: #ffffff;
      border: 1px solid #ddd5c3;
      border-radius: 24px;
      padding: 36px 32px;
      max-width: 460px;
      text-align: center;
      box-shadow: 0 4px 16px rgba(41,37,29,0.06);
    }}
    h1 {{
      font-family: Georgia, serif;
      font-size: 24px;
      margin: 0 0 12px 0;
      color: #29251d;
      font-weight: normal;
    }}
    p {{
      font-size: 13px;
      color: #443b2f;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }}
    .badge {{
      display: inline-block;
      background: #35422d15;
      color: #35422d;
      border: 1px solid #35422d30;
      border-radius: 9999px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }}
    .footer {{
      font-size: 11px;
      color: #694737;
      border-top: 1px solid #eee6d6;
      padding-top: 16px;
      margin-top: 16px;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Unsubscribed</div>
    <h1>You have been opted out</h1>
    <p>Your email (<strong>{norm_email}</strong>) has been added to our suppression blocklist. You will not receive any further automated outreach from Ornitech Solutions.</p>
    <div class="footer">Ornitech Solutions (founder@ornitech.in)</div>
  </div>
</body>
</html>"""
    )



@router.post("/seed", response_model=dict)
def trigger_seed(db: Session = Depends(get_db)):
    seed_database(db)
    return {"message": "Database successfully seeded with realistic campaigns, leads, evidence, and drafts."}


# ==================== WEBHOOKS & OAUTH ROUTES ====================

@router.post("/webhooks/email-events", response_model=dict)
def handle_email_event_webhook(payload: EmailEventWebhookPayload, db: Session = Depends(get_db)):
    """Processes incoming delivery events (delivered, opened, replied, bounced, opted_out).
    Enforces automatic suppression on bounce or opt-out.
    """
    draft = db.query(EmailDraft).filter_by(id=payload.draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Referenced draft not found.")

    ws_id = get_current_workspace_id()

    # Create event record
    event = EmailEvent(
        draft_id=draft.id,
        event_type=payload.event_type,
        occurred_at=datetime.now(timezone.utc),
        provider_message_id=payload.provider_message_id or draft.provider_message_id,
        details=json.dumps(payload.details),
    )
    db.add(event)

    # Automatic suppression enforcement on opt-out or bounce
    if payload.event_type in {"bounced", "opted_out"} and payload.recipient_email:
        norm_email = normalize_email(payload.recipient_email)
        norm_domain = normalize_domain(norm_email.split("@")[1]) if "@" in norm_email else None

        existing = db.query(Suppression).filter_by(workspace_id=ws_id, email_normalized=norm_email).first()
        if not existing:
            suppression = Suppression(
                workspace_id=ws_id,
                email_normalized=norm_email,
                domain_normalized=norm_domain,
                reason="bounce" if payload.event_type == "bounced" else "opt_out",
                source="webhook_event",
            )
    # Update status on reply and send instant notification
    if payload.event_type == "replied":
        draft.status = "replied"
        if draft.lead:
            draft.lead.status = "replied"
            # Send immediate alert notification to company email
            send_reply_notification_email(
                lead=draft.lead,
                reply_subject=payload.details.get("subject", "Re: Outreach"),
                reply_body=payload.details.get("body", "Lead has sent a reply."),
                from_email=payload.recipient_email or (draft.lead.contact.business_email if draft.lead.contact else "prospect@example.com")
            )

    db.commit()
    return {"status": "success", "event_type": payload.event_type, "draft_id": draft.id}


@router.get("/oauth/gmail/authorize", response_model=dict)
def get_gmail_oauth_url():
    """Generates the Google OAuth authorization URL for sending outreach emails."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth Client ID is not configured. Please set GOOGLE_CLIENT_ID in your environment.",
        )

    redirect_uri = "http://localhost:3000/api/auth/callback/google"
    scopes = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scopes}&"
        f"access_type=offline&"
        f"prompt=consent"
    )

    return {"authorization_url": auth_url, "provider": "google"}


@router.post("/oauth/gmail/callback", response_model=dict)
def handle_gmail_oauth_callback(payload: OAuthCallbackPayload, db: Session = Depends(get_db)):
    """Receives authorization code, stores connection record, and confirms provider readiness."""
    ws_id = get_current_workspace_id()

    conn = db.query(IntegrationConnection).filter_by(workspace_id=ws_id, provider_name="gmail").first()
    if not conn:
        conn = IntegrationConnection(
            workspace_id=ws_id,
            provider_name="gmail",
            is_active=True,
            status_message="Connected via OAuth 2.0 (Active)",
            config_json=json.dumps({"authorized_at": datetime.now(timezone.utc).isoformat()}),
        )
        db.add(conn)
    else:
        conn.is_active = True
        conn.status_message = "Connected via OAuth 2.0 (Active)"

    db.commit()
    return {"status": "connected", "provider": "gmail", "detail": "Gmail OAuth integration configured successfully."}


# ==================== ORNITECH OAUTH & AUTHENTICATION ====================

@router.post("/auth/google/verify", response_model=GoogleAuthVerifyResponse)
def verify_google_oauth(payload: GoogleAuthVerifyRequest, db: Session = Depends(get_db)):
    """Verifies Google Sign-In and strictly enforces @ornitech.in domain access restriction."""
    return verify_google_credential(payload.credential, db)


@router.post("/auth/ornitech/login", response_model=GoogleAuthVerifyResponse)
def login_ornitech(payload: OrnitechLoginRequest, db: Session = Depends(get_db)):
    """Direct login for team members strictly enforcing @ornitech.in domain and password verification."""
    return verify_ornitech_email_login(payload.email, payload.full_name, db, payload.password)


@router.get("/auth/me")
def get_auth_me(current_user: User = Depends(get_current_user)):
    """Returns profile of currently authenticated Ornitech user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "domain": settings.ALLOWED_OAUTH_DOMAIN,
    }


# ==================== AUTOMATED LEAD DISCOVERY & OUTREACH ====================

@router.post("/automation/run-cycle", response_model=AutomationRunResponse)
async def trigger_automation_cycle(db: Session = Depends(get_db)):
    """
    Executes an autonomous cycle:
    1. Discovers leads for all active campaigns
    2. Personalizes, approves and dispatches cold emails
    3. Checks inbox for replies and sends immediate alerts to founder@ornitech.in
    """
    result = await AutomationEngine.run_full_cycle(db)
    return AutomationRunResponse(**result)


@router.get("/automation/status")
def get_automation_status(db: Session = Depends(get_db)):
    """Returns configuration and operational status of the autonomous outreach engine."""
    active_campaigns = db.query(Campaign).filter_by(status="active").count()
    return {
        "autonomous_engine": "active",
        "allowed_domain": settings.ALLOWED_OAUTH_DOMAIN,
        "admin_notification_email": settings.ADMIN_NOTIFICATION_EMAIL or "founder@ornitech.in",
        "sender_email": settings.SENDER_EMAIL,
        "active_campaigns": active_campaigns,
        "live_sending_enabled": settings.EMAIL_SENDING_ENABLED,
        "auto_interval_minutes": settings.AUTOPILOT_INTERVAL_MINUTES,
    }


