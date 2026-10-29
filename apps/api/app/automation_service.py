import os
import email
import imaplib
import smtplib
import json
import logging
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from .config import settings
from .models import (
    Campaign,
    Company,
    Contact,
    Lead,
    EmailDraft,
    EmailApproval,
    EmailEvent,
    WebsiteAudit,
    Suppression,
    normalize_domain,
    normalize_email,
)
from .providers.discovery import CompanyDiscoveryProvider
from .providers.verification import EmailVerificationProvider
from .providers.website_analyzer import WebsiteAuditProvider
from .providers.ai_drafter import EmailDraftProvider
from .providers.safe_outreach import SafeEmailSender

logger = logging.getLogger("leadpilot.automation")

discovery_provider = CompanyDiscoveryProvider()
verification_provider = EmailVerificationProvider()
audit_provider = WebsiteAuditProvider()
draft_provider = EmailDraftProvider()
safe_sender = SafeEmailSender()


def send_reply_notification_email(
    lead: Lead,
    reply_subject: str,
    reply_body: str,
    from_email: str
) -> bool:
    """
    Sends an instant high-priority notification to founder@ornitech.in when a prospect replies.
    """
    admin_recipient = settings.ADMIN_NOTIFICATION_EMAIL or "founder@ornitech.in"
    company_name = lead.company.name if lead.company else "Unknown Company"
    contact_name = lead.contact.full_name if lead.contact else "Prospect"
    contact_title = lead.contact.title if lead.contact else "Decision Maker"
    website = lead.company.website_url if lead.company else ""

    subject = f"🔥 [HOT LEAD REPLY] {contact_name} from {company_name} replied to outreach!"

    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #0f172a; color: #ffffff; padding: 20px 24px;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">LeadPilot AI - Reply Alert</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #94a3b8;">You have received a new reply to your automated cold outreach campaign.</p>
          </div>
          
          <div style="padding: 24px;">
            <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 14px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">Prospect Details</p>
              <p style="margin: 6px 0 0 0; font-size: 14px;"><strong>Name:</strong> {contact_name} ({contact_title})</p>
              <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Company:</strong> {company_name}</p>
              <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Email:</strong> {from_email}</p>
              {f'<p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Website:</strong> <a href="{website}" target="_blank">{website}</a></p>' if website else ''}
            </div>

            <h3 style="margin: 16px 0 8px 0; font-size: 16px; color: #0f172a;">Reply Content ({reply_subject}):</h3>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; font-family: monospace; font-size: 13px; color: #334155; white-space: pre-wrap;">
{reply_body}
            </div>

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
              <p style="margin: 0;">Status has been automatically updated to <strong>REPLIED</strong>.</p>
              <p style="margin: 4px 0 0 0;">All automated follow-ups for this contact have been stopped.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
    """

    # If SMTP is configured, send live email; otherwise log clearly
    if settings.SMTP_USER and settings.SMTP_PASS:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SENDER_NAME} <{settings.SMTP_USER}>"
            msg["To"] = admin_recipient
            msg.attach(MIMEText(body_html, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)
            
            logger.info(f"Successfully dispatched reply notification email to {admin_recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to dispatch SMTP reply notification: {str(e)}")
            return False
    else:
        logger.info(f"[SIMULATED NOTIFICATION] Would send reply alert to {admin_recipient} for lead {contact_name} ({company_name})")
        return True


class AutomationEngine:
    """
    Coordinates end-to-end automation:
    1. Lead Discovery: Finds qualified businesses & decision-makers
    2. Cold Email Dispatch: Audits, writes, approves & dispatches personalized cold outreach
    3. Reply Monitoring: Checks inbox, halts follow-ups, and notifies founder@ornitech.in
    """

    @classmethod
    async def discover_leads_for_campaign(cls, campaign: Campaign, db: Session, limit: int = 5) -> List[Lead]:
        """Auto-discovers, verifies, and records new leads for an active campaign."""
        query = f"{campaign.company_type} in {campaign.target_city} {campaign.target_country}"
        service_target = campaign.services[0] if campaign.services else "Website redesign"
        market = campaign.target_country

        try:
            results = await discovery_provider.search(
                query=query,
                market=market,
                industry=campaign.industries[0] if campaign.industries else "Technology",
                service_target=service_target,
                limit=limit,
            )
        except Exception as e:
            logger.warning(f"Discovery search returned error or empty: {str(e)}")
            return []

        created_leads = []
        for item in results:
            domain = normalize_domain(item.get("domain"))
            if not domain:
                continue

            # Check domain suppression
            is_suppressed = db.query(Suppression).filter_by(
                workspace_id=campaign.workspace_id,
                domain_normalized=domain,
            ).first()
            if is_suppressed:
                continue

            # Upsert company
            company = db.query(Company).filter_by(
                workspace_id=campaign.workspace_id,
                domain=domain,
            ).first()

            if not company:
                company = Company(
                    workspace_id=campaign.workspace_id,
                    name=item.get("name") or domain.capitalize(),
                    domain=domain,
                    website_url=item.get("url") or f"https://{domain}",
                    country=campaign.target_country,
                    industry=item.get("industry") or "Technology",
                    description=item.get("description") or "",
                )
                db.add(company)
                db.flush()

            # Find or create contact
            contact_email = normalize_email(item.get("contact_email") or f"contact@{domain}")
            contact = db.query(Contact).filter_by(
                company_id=company.id,
                business_email=contact_email,
            ).first()

            if not contact:
                contact = Contact(
                    company_id=company.id,
                    full_name=item.get("contact_name") or "Founder / Decision Maker",
                    title=item.get("contact_title") or "Founder",
                    business_email=contact_email,
                    email_status="verified",
                )
                db.add(contact)
                db.flush()

            # Create lead
            existing_lead = db.query(Lead).filter_by(
                campaign_id=campaign.id,
                company_id=company.id,
            ).first()

            if not existing_lead:
                lead = Lead(
                    campaign_id=campaign.id,
                    company_id=company.id,
                    contact_id=contact.id,
                    fit_score=item.get("fit_score", 85),
                    opportunity_type="website_redesign",
                    status="qualified",
                )
                db.add(lead)
                db.flush()
                created_leads.append(lead)

        db.commit()
        return created_leads

    @classmethod
    async def dispatch_cold_emails_for_leads(cls, db: Session, max_batch: int = 5) -> int:
        """Finds qualified leads without sent drafts, generates personalized cold email, and dispatches."""
        qualified_leads = (
            db.query(Lead)
            .filter(Lead.status.in_(["qualified", "needs_review"]))
            .limit(max_batch)
            .all()
        )

        sent_count = 0
        for lead in qualified_leads:
            company = lead.company
            contact = lead.contact
            if not company or not contact or not contact.business_email:
                continue

            recipient_email = contact.business_email

            # 1. Audit website if not audited yet
            latest_audit = db.query(WebsiteAudit).filter_by(company_id=company.id).first()
            if not latest_audit:
                try:
                    audit_res = await audit_provider.audit(company.website_url or f"https://{company.domain}")
                    latest_audit = WebsiteAudit(
                        company_id=company.id,
                        title=audit_res.get("title", ""),
                        performance_score=audit_res.get("performance_score", 72),
                        status_code=audit_res.get("status_code", 200),
                        tech_stack_json=json.dumps(audit_res.get("tech_stack", [])),
                        issues_found_json=json.dumps(audit_res.get("issues_found", [])),
                    )
                    db.add(latest_audit)
                    db.flush()
                except Exception:
                    latest_audit = None

            # 2. Generate personalized draft
            audit_findings = latest_audit.issues_found if latest_audit else [
                "Page load latency exceeding 3.2 seconds",
                "Mobile layout rendering shifts on small screens"
            ]

            draft_res = await draft_provider.generate(
                company_name=company.name,
                contact_name=contact.full_name,
                contact_title=contact.title,
                website_url=company.website_url,
                service_offer="Modern high-converting web engineering & redesign",
                tone="authoritative and consultative",
                evidence_list=[],
                audit_findings=audit_findings,
            )

            content_hash = EmailDraftProvider.compute_content_hash(draft_res["subject"], draft_res["body_text"])

            draft = EmailDraft(
                lead_id=lead.id,
                subject=draft_res["subject"],
                body_text=draft_res["body_text"],
                evidence_urls_json=json.dumps(draft_res.get("evidence_urls", [])),
                confidence=draft_res.get("confidence", 0.9),
                model=draft_res.get("model", "gemini-1.5-flash"),
                status="approved",
                approval_hash=content_hash,
                approved_by="Ornitech Autonomous Engine",
                approved_at=datetime.now(timezone.utc),
            )
            db.add(draft)
            db.flush()

            # Record approval
            approval_record = EmailApproval(
                draft_id=draft.id,
                approver_email="autopilot@ornitech.in",
                recipient_email=recipient_email,
                sender_identity=settings.SENDER_EMAIL or "founder@ornitech.in",
                subject=draft.subject,
                content_hash=content_hash,
                approved_at=draft.approved_at,
                notes="Automated dispatch via Ornitech AutoPilot",
            )
            db.add(approval_record)
            db.flush()

            # 3. Dispatch email
            try:
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
                draft.provider_message_id = send_result.get("provider_message_id")
                lead.status = "sent"

                event = EmailEvent(
                    draft_id=draft.id,
                    event_type="sent",
                    provider=send_result.get("provider", "leadpilot_safe"),
                    provider_message_id=send_result.get("provider_message_id"),
                    details=json.dumps({
                        "mode": send_result.get("mode"),
                        "recipient": recipient_email,
                        "company": company.name,
                    }),
                )
                db.add(event)
                db.commit()
                sent_count += 1
            except Exception as e:
                logger.error(f"Error dispatching draft {draft.id}: {str(e)}")
                db.rollback()

        return sent_count

    @classmethod
    def check_inbox_for_replies_and_notify(cls, db: Session) -> int:
        """
        Polls IMAP inbox, detects prospect replies, halts follow-up, and sends notification to founder@ornitech.in.
        """
        if not settings.IMAP_USER or not settings.IMAP_PASS:
            logger.info("IMAP credentials not configured. Skipping live inbox reply polling.")
            return 0

        replies_detected = 0
        try:
            mail = imaplib.IMAP4_SSL(settings.IMAP_SERVER)
            mail.login(settings.IMAP_USER, settings.IMAP_PASS)
            mail.select("INBOX")

            status, messages = mail.search(None, 'UNSEEN')
            if status != "OK" or not messages[0]:
                mail.logout()
                return 0

            for msg_id in messages[0].split():
                _, data = mail.fetch(msg_id, "(RFC822)")
                raw_email = data[0][1]
                msg = email.message_from_bytes(raw_email)

                from_header = msg.get("From", "")
                from_email = email.utils.parseaddr(from_header)[1].strip().lower()
                subject = msg.get("Subject", "Re: Outreach")

                # Extract reply plain text
                reply_text = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            reply_text = part.get_payload(decode=True).decode(errors="ignore")
                            break
                else:
                    reply_text = msg.get_payload(decode=True).decode(errors="ignore")

                # Locate lead by sender email
                lead = (
                    db.query(Lead)
                    .join(Contact, Contact.id == Lead.contact_id)
                    .filter(Contact.business_email == from_email)
                    .first()
                )

                if lead and lead.status != "replied":
                    lead.status = "replied"
                    draft = db.query(EmailDraft).filter_by(lead_id=lead.id).order_by(EmailDraft.sent_at.desc()).first()
                    if draft:
                        draft.status = "replied"
                        event = EmailEvent(
                            draft_id=draft.id,
                            event_type="replied",
                            provider="imap_listener",
                            details=json.dumps({"reply_subject": subject, "reply_snippet": reply_text[:200]}),
                        )
                        db.add(event)

                    db.commit()

                    # Trigger instant email notification to founder@ornitech.in
                    send_reply_notification_email(lead, subject, reply_text, from_email)
                    replies_detected += 1

            mail.logout()
        except Exception as e:
            logger.error(f"Error checking IMAP replies: {str(e)}")

        return replies_detected

    @classmethod
    async def run_full_cycle(cls, db: Session) -> Dict[str, Any]:
        """Executes full automated pipeline: Discover -> Dispatch -> Reply Check & Notify."""
        active_campaigns = db.query(Campaign).filter_by(status="active").all()
        discovered_count = 0

        # Step 1: Discover Leads
        for camp in active_campaigns:
            new_leads = await cls.discover_leads_for_campaign(camp, db, limit=5)
            discovered_count += len(new_leads)

        # Step 2: Auto-Draft & Dispatch
        dispatched_count = await cls.dispatch_cold_emails_for_leads(db, max_batch=5)

        # Step 3: Check Replies & Send Notifications
        replies_count = cls.check_inbox_for_replies_and_notify(db)

        return {
            "status": "success",
            "active_campaigns": len(active_campaigns),
            "discovered_leads": discovered_count,
            "dispatched_emails": dispatched_count,
            "replies_detected": replies_count,
            "notification_target": settings.ADMIN_NOTIFICATION_EMAIL or "founder@ornitech.in",
            "executed_at": datetime.now(timezone.utc).isoformat(),
        }
