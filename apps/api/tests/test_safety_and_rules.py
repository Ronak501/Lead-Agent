import pytest
from datetime import datetime, timezone
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Workspace, Campaign, Company, Contact, Lead, Evidence, EmailDraft, Suppression
from app.providers.ai_drafter import EmailDraftProvider
from app.providers.safe_outreach import SafeEmailSender, SafetyViolation
from app.providers.website_analyzer import is_ssrf_safe


# Setup an in-memory SQLite database for isolated unit testing
@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Create workspace
    ws = Workspace(id="ws_test", name="Test Workspace", owner_email="test@leadpilot.ai")
    session.add(ws)

    # Create test campaign
    c = Campaign(
        id="cmp_test",
        workspace_id=ws.id,
        name="Test Campaign",
        target_country="India",
        target_city="Bangalore",
        company_type="B2B SaaS",
        max_lead_count=20,
    )
    session.add(c)
    session.commit()

    yield session
    session.close()


def test_ssrf_protection_blocks_private_and_loopback_ips():
    """Verify SSRF protection strictly blocks localhost, 127.0.0.1, and metadata."""
    safe_localhost, reason1 = is_ssrf_safe("http://localhost:8000/internal")
    assert not safe_localhost
    assert "localhost" in reason1.lower() or "blocked" in reason1.lower()

    safe_loopback, reason2 = is_ssrf_safe("http://127.0.0.1:5432")
    assert not safe_loopback

    safe_metadata, reason3 = is_ssrf_safe("http://metadata.google.internal/computeMetadata/v1")
    assert not safe_metadata


def test_approval_bypass_prevention():
    """Verify that an unapproved draft CANNOT be sent under any circumstances."""
    sender = SafeEmailSender()

    # Attempt to send with approved_at = None
    with pytest.raises(SafetyViolation) as exc_info:
        import asyncio
        asyncio.run(sender.send(
            draft_id="draft_unapproved",
            to_email="prospect@example.com",
            subject="Idea for website",
            body_text="Hello",
            approved_at=None,  # Not approved!
            approval_hash=None,
            is_suppressed=False,
            email_status="verified",
        ))

    assert "unapproved" in str(exc_info.value).lower()


def test_suppression_enforcement():
    """Verify that a suppressed email address CANNOT be sent even if approved."""
    sender = SafeEmailSender()

    with pytest.raises(SafetyViolation) as exc_info:
        import asyncio
        asyncio.run(sender.send(
            draft_id="draft_approved",
            to_email="optout@example.com",
            subject="Idea for website",
            body_text="Hello",
            approved_at=datetime.now(timezone.utc),
            approval_hash="fakehash",
            is_suppressed=True,  # Suppressed!
            email_status="verified",
        ))

    assert "suppression" in str(exc_info.value).lower()


def test_unverified_email_blocked():
    """Verify that an unverified/unknown email status is blocked from outreach."""
    sender = SafeEmailSender()

    with pytest.raises(SafetyViolation) as exc_info:
        import asyncio
        asyncio.run(sender.send(
            draft_id="draft_approved",
            to_email="unknown@example.com",
            subject="Idea for website",
            body_text="Hello",
            approved_at=datetime.now(timezone.utc),
            approval_hash="fakehash",
            is_suppressed=False,
            email_status="invalid",  # Invalid email!
        ))

    assert "verified" in str(exc_info.value).lower()


def test_content_hashing_tamper_detection():
    """Verify content hash algorithm uniquely fingerprints exact subject & body."""
    subject = "Idea for your web app"
    body1 = "Hi Vikram, I noticed your page latency is 3.4 seconds."
    body2 = "Hi Vikram, I noticed your page latency is 3.5 seconds."  # Altered

    hash1 = EmailDraftProvider.compute_content_hash(subject, body1)
    hash2 = EmailDraftProvider.compute_content_hash(subject, body2)

    assert hash1 != hash2
    assert len(hash1) == 64  # SHA-256 hex string


def test_normalization_helpers():
    """Verify domain and email normalization routines."""
    from app.models import normalize_domain, normalize_email

    assert normalize_domain("https://www.example.com/pricing?utm=test") == "example.com"
    assert normalize_domain("http://sub.domain.co.in/path/") == "sub.domain.co.in"
    assert normalize_domain("RAWDOMAIN.COM") == "rawdomain.com"

    assert normalize_email("  Founder@Domain.COM  ") == "founder@domain.com"
    assert normalize_email(None) is None


def test_workspace_isolation(db_session):
    """Verify strict multi-tenant workspace isolation."""
    from app.models import Workspace, Company

    ws1 = Workspace(id="ws_alpha", name="Alpha Org", owner_email="alpha@leadpilot.ai")
    ws2 = Workspace(id="ws_beta", name="Beta Org", owner_email="beta@leadpilot.ai")
    db_session.add_all([ws1, ws2])
    db_session.commit()

    comp1 = Company(id="c1", workspace_id=ws1.id, name="Company One", domain="one.com")
    comp2 = Company(id="c2", workspace_id=ws2.id, name="Company Two", domain="two.com")
    db_session.add_all([comp1, comp2])
    db_session.commit()

    # Query within Workspace 1 context
    ws1_companies = db_session.query(Company).filter_by(workspace_id=ws1.id).all()
    assert len(ws1_companies) == 1
    assert ws1_companies[0].name == "Company One"

    # Query within Workspace 2 context
    ws2_companies = db_session.query(Company).filter_by(workspace_id=ws2.id).all()
    assert len(ws2_companies) == 1
    assert ws2_companies[0].name == "Company Two"


@pytest.mark.asyncio
async def test_email_verification_syntax_and_disposable():
    """Verify email verification provider rejects malformed and disposable addresses."""
    from app.providers.verification import EmailVerificationProvider

    provider = EmailVerificationProvider()

    # Invalid syntax
    bad_syntax = await provider.verify("not-an-email")
    assert bad_syntax["status"] == "invalid"
    assert "syntax" in bad_syntax["reason"].lower() or "malformed" in bad_syntax["reason"].lower()

    # Disposable domain
    disposable = await provider.verify("test@mailinator.com")
    assert disposable["status"] == "invalid"
    assert "disposable" in disposable["reason"].lower() or "temporary" in disposable["reason"].lower()


@pytest.mark.asyncio
async def test_discovery_provider_unconfigured_behavior():
    """Verify discovery provider raises informative error when unconfigured and web search fails."""
    from app.providers.discovery import CompanyDiscoveryProvider, ProviderNotConfiguredException
    from unittest.mock import patch

    provider = CompanyDiscoveryProvider(apollo_key="")

    with patch.object(provider, "_search_web", return_value=[]):
        with pytest.raises(ProviderNotConfiguredException) as exc_info:
            await provider.search(query="B2B Logistics", market="India", industry="Logistics")

        assert "configured" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_tampered_content_hash_fails_send():
    """Verify that if draft content changes after approval, SafeEmailSender raises SafetyViolation."""
    from app.providers.safe_outreach import SafeEmailSender, SafetyViolation
    from app.providers.ai_drafter import EmailDraftProvider

    sender = SafeEmailSender()
    orig_subject = "Original Subject"
    orig_body = "Original verified body"
    approval_hash = EmailDraftProvider.compute_content_hash(orig_subject, orig_body)

    # Tampered body
    tampered_body = "Altered body with fabricated metric"

    with pytest.raises(SafetyViolation) as exc_info:
        await sender.send(
            draft_id="d1",
            to_email="prospect@domain.com",
            subject=orig_subject,
            body_text=tampered_body,
            approved_at=datetime.now(timezone.utc),
            approval_hash=approval_hash,
            is_suppressed=False,
            email_status="verified",
        )

    assert "tampering" in str(exc_info.value).lower() or "altered" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_ai_drafter_grounds_in_evidence():
    """Verify EmailDraftProvider strictly grounds content in provided evidence."""
    from app.providers.ai_drafter import EmailDraftProvider

    drafter = EmailDraftProvider(groq_key="", gemini_key="")
    draft = await drafter.generate(
        company_name="Kavach Tech",
        contact_name="Vikram",
        contact_title="COO",
        website_url="https://kavach.in",
        service_offer="Next.js upgrade",
        tone="professional",
        evidence_list=[{"source_url": "https://kavach.in", "excerpt": "Homepage loads in 3.4 seconds"}],
    )

    assert "3.4 seconds" in draft["body_text"]
    assert "Ronak Talaviya" in draft["body_text"]
    assert "Founder, Ornitech Solutions" in draft["body_text"]
    assert "https://ornitech.in" in draft["body_text"]
    assert draft["model"] == "grounded-heuristic-engine"
    assert len(draft["evidence_urls"]) == 1


def test_anti_spam_deduplication_rule(db_session):
    """Verify that an email can NEVER be sent twice to the same startup domain or founder email."""
    from app.automation_service import is_target_already_contacted

    ws = db_session.query(Workspace).filter_by(id="ws_test").first()
    comp = Company(
        workspace_id=ws.id,
        name="Acme Startups",
        domain="acmestartup.io",
        website_url="https://acmestartup.io",
    )
    db_session.add(comp)
    db_session.flush()

    cnt = Contact(
        company_id=comp.id,
        full_name="Alice Founder",
        business_email="alice@acmestartup.io",
        email_status="verified",
    )
    db_session.add(cnt)
    db_session.flush()

    lead = Lead(
        campaign_id="cmp_test",
        company_id=comp.id,
        contact_id=cnt.id,
        status="qualified",
    )
    db_session.add(lead)
    db_session.flush()

    # Before outreach has occurred:
    contacted, _ = is_target_already_contacted(
        db_session, ws.id, domain="acmestartup.io", email="alice@acmestartup.io"
    )
    assert not contacted

    # Simulate email sent
    draft = EmailDraft(
        lead_id=lead.id,
        subject="Feedback on Acme",
        body_text="Hi Alice",
        status="sent",
        sent_at=datetime.now(timezone.utc),
    )
    db_session.add(draft)
    lead.status = "sent"
    db_session.commit()

    # After outreach: Both domain and founder email MUST be blocked from any future outreach!
    contacted_domain, reason_d = is_target_already_contacted(
        db_session, ws.id, domain="acmestartup.io", email="anotherfounder@acmestartup.io"
    )
    assert contacted_domain
    assert "acmestartup.io" in reason_d

    contacted_founder, reason_f = is_target_already_contacted(
        db_session, ws.id, domain="differentbrand.com", email="alice@acmestartup.io"
    )
    assert contacted_founder
    assert "alice@acmestartup.io" in reason_f





