from datetime import datetime, timezone
import json
from sqlalchemy.orm import Session
from .models import (
    User,
    Workspace,
    WorkspaceMember,
    Campaign,
    Company,
    Contact,
    Lead,
    Evidence,
    WebsiteAudit,
    EmailDraft,
    Suppression,
)
from .providers.ai_drafter import EmailDraftProvider


def seed_database(db: Session, workspace_id: str = "ws_default_01"):
    # 1. Ensure User
    user = db.query(User).filter_by(email="founder@leadpilot.ai").first()
    if not user:
        user = User(
            id="usr_default_01",
            email="founder@leadpilot.ai",
            full_name="Ronak (Lead Pilot)",
            is_active=True,
        )
        db.add(user)
        db.commit()

    # 2. Ensure Workspace
    ws = db.query(Workspace).filter_by(id=workspace_id).first()
    if not ws:
        ws = Workspace(
            id=workspace_id,
            name="LeadPilot Growth",
            owner_email="founder@leadpilot.ai",
            plan="growth",
        )
        db.add(ws)
        db.commit()

    # 3. Ensure Workspace Membership
    member = db.query(WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=user.id).first()
    if not member:
        member = WorkspaceMember(
            id="mem_default_01",
            workspace_id=workspace_id,
            user_id=user.id,
            role="owner",
        )
        db.add(member)
        db.commit()

    # 2. Ensure Demo Campaign
    campaign = db.query(Campaign).filter_by(workspace_id=workspace_id).first()
    if not campaign:
        campaign = Campaign(
            id="cmp_india_saas_01",
            workspace_id=workspace_id,
            name="India & Global Startups — Web & SaaS Redesign",
            target_markets_json=json.dumps(["India", "Global"]),
            industries_json=json.dumps(["Startups", "SaaS", "FinTech", "Logistics"]),
            locations_json=json.dumps(["Bangalore", "Mumbai", "Delhi NCR", "Remote"]),
            company_sizes_json=json.dumps(["1-10", "11-50"]),
            services_json=json.dumps(["Website redesign", "Custom SaaS development", "Landing page conversion"]),
            notes="High-intent B2B businesses where a faster, modern web presence unlocks immediate enterprise contracts.",
            status="active",
        )
        db.add(campaign)
        db.commit()

    # 4. Companies, Contacts, Evidence, and Audits
    sample_data = [
        {
            "company": "Kavach Logistics Tech",
            "domain": "kavachlogistics.in",
            "website_url": "https://kavachlogistics.in",
            "country": "India",
            "industry": "Logistics & Supply Chain",
            "contact_name": "Vikram Malhotra",
            "contact_title": "Co-Founder & COO",
            "email": "vikram@kavachlogistics.in",
            "evidence_type": "website_latency",
            "evidence_excerpt": "Public site homepage latency is 3.4s on 4G networks; lacks dynamic quote calculator for enterprise shippers.",
            "tech_stack": ["WordPress", "jQuery", "Apache"],
            "issues": ["High page latency (3.4s)", "Missing mobile viewport optimization", "No self-service quote calculator"],
            "opportunity": "Full Next.js rebuild with instant instant shipment booking calculator.",
            "fit_score": 92,
            "draft_status": "pending_review",
        },
        {
            "company": "Zenith Cloud Metrics",
            "domain": "zenithmetrics.io",
            "website_url": "https://zenithmetrics.io",
            "country": "India",
            "industry": "Developer Tools",
            "contact_name": "Ananya Sharma",
            "contact_title": "Founder & CEO",
            "email": "ananya@zenithmetrics.io",
            "evidence_type": "saas_dashboard_gap",
            "evidence_excerpt": "Customer documentation and interactive telemetry graphs currently rely on static iframes without real-time filtering.",
            "tech_stack": ["React", "Static HTML", "Tailwind CSS"],
            "issues": ["Static documentation architecture", "Missing interactive API explorer"],
            "opportunity": "Modern developer documentation portal with live interactive API playground.",
            "fit_score": 88,
            "draft_status": "approved",
        },
        {
            "company": "Pinnacle Diagnostics",
            "domain": "pinnaclediagnostics.com",
            "website_url": "https://pinnaclediagnostics.com",
            "country": "India",
            "industry": "Healthcare & Wellness",
            "contact_name": "Dr. Rohan Deshmukh",
            "contact_title": "Managing Director",
            "email": "rohan@pinnaclediagnostics.com",
            "evidence_type": "missing_cta",
            "evidence_excerpt": "No online patient booking flow or home sample collection scheduler; site only lists landline telephone numbers.",
            "tech_stack": ["PHP", "WordPress 5.8"],
            "issues": ["No online appointment booking", "Legacy CMS vulnerabilities", "Missing SSL certificate redirects"],
            "opportunity": "Patient portal with WhatsApp OTP login and home test kit booking.",
            "fit_score": 84,
            "draft_status": "pending_review",
        },
        {
            "company": "Veloce Fleet Technologies",
            "domain": "velocefleet.tech",
            "website_url": "https://velocefleet.tech",
            "country": "Global",
            "industry": "IoT & Automotive",
            "contact_name": "Sarah Chen",
            "contact_title": "VP of Product",
            "email": "sarah.chen@velocefleet.tech",
            "evidence_type": "saas_platform_need",
            "evidence_excerpt": "Announced $2.5M seed round to scale telematics hardware; public website lacks customer fleet analytics dashboard.",
            "tech_stack": ["Squarespace", "Google Fonts"],
            "issues": ["Generic landing template", "Lacks customer portal login", "Low mobile responsiveness score"],
            "opportunity": "Custom enterprise fleet dashboard and interactive ROI calculator.",
            "fit_score": 95,
            "draft_status": "pending_review",
        },
        {
            "company": "Blesso AI",
            "domain": "blesso.ai",
            "website_url": "https://blesso.ai",
            "country": "Global",
            "industry": "Artificial Intelligence",
            "contact_name": "Founder",
            "contact_title": "Founder & CEO",
            "email": "contact@blesso.ai",
            "evidence_type": "ai_platform_optimization",
            "evidence_excerpt": "Cutting-edge AI platform at blesso.ai; modernizing enterprise integrations, landing conversion funnel, and high-speed API performance.",
            "tech_stack": ["Next.js", "Tailwind CSS", "Vercel"],
            "issues": ["Opportunity for enterprise custom workflow modules", "Accelerated dynamic edge caching"],
            "opportunity": "Modern enterprise frontend modernization, custom agent orchestration UI, and conversion funnel optimization.",
            "fit_score": 96,
            "draft_status": "pending_review",
        },
    ]

    for item in sample_data:
        existing_comp = db.query(Company).filter_by(workspace_id=workspace_id, domain=item["domain"]).first()
        if existing_comp:
            continue

        comp = Company(
            workspace_id=workspace_id,
            name=item["company"],
            domain=item["domain"],
            website_url=item["website_url"],
            country=item["country"],
            industry=item["industry"],
            description=f"High-growth business in {item['industry']}.",
        )
        db.add(comp)
        db.flush()

        contact = Contact(
            company_id=comp.id,
            full_name=item["contact_name"],
            title=item["contact_title"],
            business_email=item["email"],
            email_status="verified",
            source_provider="verified_business_directory",
        )
        db.add(contact)
        db.flush()

        lead = Lead(
            campaign_id=campaign.id,
            company_id=comp.id,
            contact_id=contact.id,
            fit_score=item["fit_score"],
            opportunity_type="website_redesign",
            status="qualified",
        )
        db.add(lead)
        db.flush()

        # Evidence
        ev = Evidence(
            lead_id=lead.id,
            company_id=comp.id,
            source_url=item["website_url"],
            evidence_type=item["evidence_type"],
            excerpt=item["evidence_excerpt"],
            confidence=0.88,
        )
        db.add(ev)

        # Audit
        audit = WebsiteAudit(
            company_id=comp.id,
            status_code=200,
            title=f"{item['company']} — Official Website",
            meta_description=f"Official website for {item['company']}",
            tech_stack_json=json.dumps(item["tech_stack"]),
            issues_found_json=json.dumps(item["issues"]),
            opportunity_summary=item["opportunity"],
            performance_score=72 if "WordPress" in item["tech_stack"] else 86,
        )
        db.add(audit)

        # Draft
        salutation = item["contact_name"].split()[0]
        subject = f"An idea for {item['company']}'s web presence"
        body = (
            f"Hi {salutation},\n\n"
            f"I was reviewing {item['company']}'s website recently. {item['evidence_excerpt']}\n\n"
            f"We specialize in modern web application engineering and conversion optimization at Ornitech Solutions (https://ornitech.in), helping companies upgrade to ultra-fast Next.js stacks that turn visitors into paying customers.\n\n"
            f"Would a brief 10-minute chat or an async 2-minute video teardown be helpful?\n\n"
            f"If this isn't relevant to your current roadmap, simply let me know and I won't follow up.\n\n"
            f"Best regards,\n"
            f"Ronak Talaviya\n"
            f"Founder, Ornitech Solutions\n"
            f"https://ornitech.in"
        )
        content_hash = EmailDraftProvider.compute_content_hash(subject, body)

        draft = EmailDraft(
            lead_id=lead.id,
            subject=subject,
            body_text=body,
            evidence_urls_json=json.dumps([item["website_url"]]),
            confidence=0.89,
            model="gemini-1.5-flash",
            status=item["draft_status"],
            approval_hash=content_hash if item["draft_status"] == "approved" else None,
            approved_by="Lead Reviewer" if item["draft_status"] == "approved" else None,
            approved_at=datetime.now(timezone.utc) if item["draft_status"] == "approved" else None,
        )
        db.add(draft)

    # Suppression list demo entries
    db.add(Suppression(
        workspace_id=workspace_id,
        email_normalized="unsubscribe@competitor.com",
        domain_normalized="competitor.com",
        reason="opt_out",
        source="system",
    ))

    db.commit()
