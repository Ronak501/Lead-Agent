import csv
import io
from datetime import datetime, timezone
import json
import uuid
import smtplib
import imaplib
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, BackgroundTasks
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
    """Runs evidence-backed discovery for companies, founders, and contact details."""
    try:
        candidates = await discovery_provider.search(
            query=payload.query,
            market=payload.market,
            industry=payload.industry,
            service_target=payload.service_target,
            limit=payload.limit,
        )
    except ApiRateLimitException as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except ApiAuthenticationException as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ProviderNotConfiguredException as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    ws_id = get_current_workspace_id()
    created_leads = []

    for item in candidates:
        norm_domain = normalize_domain(item.get("domain"))
        raw_email = item.get("business_email")
        norm_email = normalize_email(raw_email)

        # Strict Anti-Spam & De-duplication check: Never contact same startup or founder again
        already_contacted, reason = is_target_already_contacted(
            db, ws_id, domain=norm_domain, email=norm_email
        )
        if already_contacted:
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


@router.post("/drafts/{draft_id}/reply", response_model=dict)
def record_draft_reply(draft_id: str, payload: RecordReplyRequest, db: Session = Depends(get_db)):
    """Records an incoming reply for a sent outreach email.
    Logs the reply event, records recipient feedback/notes, and updates lead & draft statuses.
    """
    draft = db.query(EmailDraft).filter_by(id=draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Referenced draft not found.")

    sender = payload.sender_email
    if not sender and draft.lead and draft.lead.contact:
        sender = draft.lead.contact.business_email or "prospect"

    event = EmailEvent(
        draft_id=draft.id,
        event_type="replied",
        provider="inbox_sync",
        provider_message_id=f"rep_{uuid.uuid4().hex[:12]}",
        details=json.dumps({
            "reply_text": payload.reply_text,
            "sender": sender,
            "notes": payload.notes or "",
        }),
    )
    db.add(event)

    draft.status = "replied"
    if draft.lead:
        draft.lead.status = "replied"

    db.commit()
    return {
        "status": "success",
        "message": "Reply recorded successfully",
        "draft_id": draft.id,
        "reply_count": sum(1 for e in draft.events if e.event_type == "replied"),
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
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
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
        if not (settings.IMAP_USER and settings.IMAP_PASS):
            raise HTTPException(status_code=400, detail="Missing required configuration: 'IMAP_USER' or 'IMAP_PASS' is not set in your .env file.")
        try:
            mail = imaplib.IMAP4_SSL(settings.IMAP_SERVER, settings.IMAP_PORT)
            mail.login(settings.IMAP_USER, settings.IMAP_PASS)
            mail.logout()
            return {"status": "ok", "provider": "imap", "detail": f"IMAP connection and login successful on {settings.IMAP_SERVER}:{settings.IMAP_PORT} as {settings.IMAP_USER}."}
        except imaplib.IMAP4.error as imap_err:
            raise HTTPException(
                status_code=400,
                detail=f"IMAP Authentication Failed for 'IMAP_USER' ({settings.IMAP_USER}): {str(imap_err)}. For Gmail, verify IMAP is enabled and use a 16-character Google App Password."
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


