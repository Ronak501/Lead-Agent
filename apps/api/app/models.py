from datetime import datetime, timezone
import json
import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Integer,
    Float,
    Boolean,
)
from sqlalchemy.orm import relationship
from .database import Base


def now_utc():
    return datetime.now(timezone.utc)


def gen_uuid():
    return str(uuid.uuid4())


def normalize_domain(domain_or_url: str | None) -> str | None:
    """Normalizes domains by stripping protocol, www, and query params."""
    if not domain_or_url:
        return None
    d = domain_or_url.strip().lower()
    if d.startswith("http://"):
        d = d[7:]
    elif d.startswith("https://"):
        d = d[8:]
    if d.startswith("www."):
        d = d[4:]
    return d.split("/")[0].split("?")[0].strip()


def normalize_email(email: str | None) -> str | None:
    """Normalizes email to trimmed lowercase."""
    if not email:
        return None
    return email.strip().lower()


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=True, default="")
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    memberships = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    name = Column(String(120), nullable=False, default="Default Workspace")
    owner_email = Column(String(255), nullable=False, default="founder@leadpilot.ai")
    plan = Column(String(50), default="growth")
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="workspace", cascade="all, delete-orphan")
    companies = relationship("Company", back_populates="workspace", cascade="all, delete-orphan")
    suppressions = relationship("Suppression", back_populates="workspace", cascade="all, delete-orphan")
    connections = relationship("IntegrationConnection", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    workspace_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="member")  # owner, admin, member, reviewer
    created_at = Column(DateTime, default=now_utc)

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    workspace_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    target_country = Column(String(100), default="India")
    target_city = Column(String(100), default="Bangalore")
    company_type = Column(String(100), default="B2B SaaS")
    max_lead_count = Column(Integer, default=50)
    qualification_criteria = Column(Text, default="Has active web domain, identified latency/tech stack gaps, and verified decision-maker email")
    target_markets_json = Column(Text, default="[\"India\", \"Global\"]")
    industries_json = Column(Text, default="[\"Startups\", \"SaaS\", \"Local businesses\"]")
    locations_json = Column(Text, default="[\"Bangalore\", \"Mumbai\", \"Remote\"]")
    company_sizes_json = Column(Text, default="[\"1-10\", \"11-50\"]")
    services_json = Column(Text, default="[\"Website development\", \"Website redesign\", \"Custom SaaS development\"]")
    notes = Column(Text, default="")
    status = Column(String(50), default="active")  # draft, active, paused, completed
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    workspace = relationship("Workspace", back_populates="campaigns")
    leads = relationship("Lead", back_populates="campaign", cascade="all, delete-orphan")

    @property
    def target_markets(self):
        return json.loads(self.target_markets_json or "[]")

    @target_markets.setter
    def target_markets(self, val):
        self.target_markets_json = json.dumps(val)

    @property
    def industries(self):
        return json.loads(self.industries_json or "[]")

    @industries.setter
    def industries(self, val):
        self.industries_json = json.dumps(val)

    @property
    def locations(self):
        return json.loads(self.locations_json or "[]")

    @locations.setter
    def locations(self, val):
        self.locations_json = json.dumps(val)

    @property
    def company_sizes(self):
        return json.loads(self.company_sizes_json or "[]")

    @company_sizes.setter
    def company_sizes(self, val):
        self.company_sizes_json = json.dumps(val)

    @property
    def services(self):
        return json.loads(self.services_json or "[]")

    @services.setter
    def services(self, val):
        self.services_json = json.dumps(val)


class Company(Base):
    __tablename__ = "companies"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    workspace_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    domain = Column(String(255), nullable=True, index=True)
    website_url = Column(String(500), nullable=True)
    country = Column(String(100), default="India")
    industry = Column(String(120), default="Technology")
    description = Column(Text, default="")
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    workspace = relationship("Workspace", back_populates="companies")
    contacts = relationship("Contact", back_populates="company", cascade="all, delete-orphan")
    audits = relationship("WebsiteAudit", back_populates="company", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="company", cascade="all, delete-orphan")

    def set_domain(self, raw_domain: str | None):
        self.domain = normalize_domain(raw_domain)


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    title = Column(String(150), default="Founder / Decision Maker")
    business_email = Column(String(255), nullable=True, index=True)
    email_status = Column(String(50), default="unknown")  # valid, verified, invalid, unknown, accept_all
    profile_url = Column(String(500), nullable=True)
    source_provider = Column(String(100), default="manual_import")
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    company = relationship("Company", back_populates="contacts")
    leads = relationship("Lead", back_populates="contact")

    def set_email(self, raw_email: str | None):
        self.business_email = normalize_email(raw_email)


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    campaign_id = Column(String(64), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id = Column(String(64), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    fit_score = Column(Integer, default=75)
    opportunity_type = Column(String(100), default="website_redesign")
    status = Column(String(50), default="needs_review")  # needs_review, qualified, draft_generated, approved, sent, rejected
    last_reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    campaign = relationship("Campaign", back_populates="leads")
    company = relationship("Company", back_populates="leads")
    contact = relationship("Contact", back_populates="leads")
    evidence = relationship("SourceEvidence", back_populates="lead", cascade="all, delete-orphan")
    drafts = relationship("EmailDraft", back_populates="lead", cascade="all, delete-orphan")


class SourceEvidence(Base):
    __tablename__ = "source_evidence"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    lead_id = Column(String(64), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    source_url = Column(String(500), nullable=False)
    evidence_type = Column(String(100), nullable=False)  # website_issue, tech_stack, growth_signal, public_post
    excerpt = Column(Text, nullable=False)
    observed_at = Column(DateTime, default=now_utc)
    confidence = Column(Float, default=0.85)
    created_at = Column(DateTime, default=now_utc)

    lead = relationship("Lead", back_populates="evidence")


# Backwards compatibility alias
Evidence = SourceEvidence


class WebsiteAudit(Base):
    __tablename__ = "website_audits"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    company_id = Column(String(64), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    checked_at = Column(DateTime, default=now_utc)
    status_code = Column(Integer, default=200)
    title = Column(String(300), default="")
    meta_description = Column(Text, default="")
    tech_stack_json = Column(Text, default="[]")
    issues_found_json = Column(Text, default="[]")
    opportunity_summary = Column(Text, default="")
    performance_score = Column(Integer, default=70)
    created_at = Column(DateTime, default=now_utc)

    company = relationship("Company", back_populates="audits")

    @property
    def tech_stack(self):
        return json.loads(self.tech_stack_json or "[]")

    @tech_stack.setter
    def tech_stack(self, val):
        self.tech_stack_json = json.dumps(val)

    @property
    def issues_found(self):
        return json.loads(self.issues_found_json or "[]")

    @issues_found.setter
    def issues_found(self, val):
        self.issues_found_json = json.dumps(val)


class EmailDraft(Base):
    __tablename__ = "email_drafts"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    lead_id = Column(String(64), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(300), nullable=False)
    body_text = Column(Text, nullable=False)
    evidence_urls_json = Column(Text, default="[]")
    confidence = Column(Float, default=0.8)
    model = Column(String(100), default="gemini-1.5-flash")
    status = Column(String(50), default="pending_review")  # pending_review, approved, rejected, sent
    approval_hash = Column(String(64), nullable=True)  # SHA-256 of exact content to prevent tampering
    approved_by = Column(String(200), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    provider_message_id = Column(String(255), nullable=True)
    generated_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    lead = relationship("Lead", back_populates="drafts")
    events = relationship("EmailEvent", back_populates="draft", cascade="all, delete-orphan")
    approvals = relationship("EmailApproval", back_populates="draft", cascade="all, delete-orphan")

    @property
    def evidence_urls(self):
        return json.loads(self.evidence_urls_json or "[]")

    @evidence_urls.setter
    def evidence_urls(self, val):
        self.evidence_urls_json = json.dumps(val)


class EmailApproval(Base):
    __tablename__ = "email_approvals"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    draft_id = Column(String(64), ForeignKey("email_drafts.id", ondelete="CASCADE"), nullable=False, index=True)
    approver_email = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    sender_identity = Column(String(255), default="outreach@leadpilot.ai")
    subject = Column(String(300), nullable=False)
    content_hash = Column(String(64), nullable=False)  # SHA-256 fingerprint
    approved_at = Column(DateTime, default=now_utc)
    notes = Column(Text, default="")

    draft = relationship("EmailDraft", back_populates="approvals")


class EmailEvent(Base):
    __tablename__ = "email_events"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    draft_id = Column(String(64), ForeignKey("email_drafts.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # sent, delivered, opened, clicked, replied, bounced, opted_out
    occurred_at = Column(DateTime, default=now_utc)
    provider = Column(String(50), default="mock_smtp")
    provider_message_id = Column(String(255), nullable=True)
    details = Column(Text, default="{}")

    draft = relationship("EmailDraft", back_populates="events")


class Suppression(Base):
    __tablename__ = "suppressions"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    workspace_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    email_normalized = Column(String(255), nullable=False, index=True)
    domain_normalized = Column(String(255), nullable=True, index=True)
    reason = Column(String(100), default="opt_out")  # opt_out, bounce, spam_complaint, manual
    source = Column(String(100), default="user_action")
    created_at = Column(DateTime, default=now_utc)

    workspace = relationship("Workspace", back_populates="suppressions")


class IntegrationConnection(Base):
    __tablename__ = "integration_connections"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    workspace_id = Column(String(64), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_name = Column(String(50), nullable=False, index=True)  # gemini, apollo, hunter, gmail, pagespeed
    encrypted_credentials = Column(Text, default="")
    config_json = Column(Text, default="{}")
    is_active = Column(Boolean, default=False)
    last_tested_at = Column(DateTime, nullable=True)
    status_message = Column(String(255), default="Ready to configure")
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    workspace = relationship("Workspace", back_populates="connections")


# Backwards compatibility alias
IntegrationSetting = IntegrationConnection


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, default=gen_uuid)
    workspace_id = Column(String(64), nullable=False, index=True)
    user_email = Column(String(255), default="user@leadpilot.ai")
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(64), nullable=True)
    details = Column(Text, default="")
    created_at = Column(DateTime, default=now_utc)
