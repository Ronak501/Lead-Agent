from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4
from pydantic import BaseModel, Field, HttpUrl, EmailStr


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ===================== CAMPAIGN SCHEMAS =====================

class CampaignCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    target_country: str = Field(default="India", max_length=100)
    target_city: str = Field(default="Bangalore", max_length=100)
    company_type: str = Field(default="B2B SaaS", max_length=100)
    max_lead_count: int = Field(default=50, ge=1, le=500)
    qualification_criteria: str = Field(default="Has active domain, identified latency/tech issues, verified decision-maker email", max_length=1000)
    target_markets: list[str] = Field(default_factory=lambda: ["India", "Global"])
    industries: list[str] = Field(default_factory=lambda: ["Startups", "SaaS", "Local businesses"])
    locations: list[str] = Field(default_factory=lambda: ["Bangalore", "Mumbai", "Remote"])
    company_sizes: list[str] = Field(default_factory=lambda: ["1-10", "11-50"])
    services: list[str] = Field(default_factory=lambda: ["Website development", "Website redesign", "Custom SaaS development"])
    notes: str = Field(default="", max_length=2000)


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    target_country: Optional[str] = None
    target_city: Optional[str] = None
    company_type: Optional[str] = None
    max_lead_count: Optional[int] = None
    qualification_criteria: Optional[str] = None
    target_markets: Optional[list[str]] = None
    industries: Optional[list[str]] = None
    locations: Optional[list[str]] = None
    company_sizes: Optional[list[str]] = None
    services: Optional[list[str]] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class CampaignOut(CampaignCreate):
    id: str
    workspace_id: str
    status: str
    created_at: datetime
    leads_count: int = 0
    drafts_count: int = 0


# ===================== EVIDENCE & AUDIT SCHEMAS =====================

class EvidenceInput(BaseModel):
    source_url: str
    evidence_type: str = Field(min_length=2, max_length=100)
    excerpt: str = Field(min_length=2, max_length=2000)
    observed_at: datetime = Field(default_factory=now_utc)
    confidence: float = Field(default=0.8, ge=0, le=1)


class EvidenceOut(EvidenceInput):
    id: str
    lead_id: str
    company_id: Optional[str] = None


class WebsiteAuditOut(BaseModel):
    id: str
    company_id: str
    checked_at: datetime
    status_code: int
    title: str
    meta_description: str
    tech_stack: list[str]
    issues_found: list[str]
    opportunity_summary: str
    performance_score: int


# ===================== LEAD SCHEMAS =====================

class LeadImport(BaseModel):
    campaign_id: Optional[str] = None
    company_name: str = Field(min_length=2, max_length=200)
    domain: Optional[str] = Field(default=None, max_length=253)
    website_url: Optional[str] = None
    country: Optional[str] = Field(default="India", max_length=100)
    industry: Optional[str] = Field(default="Technology", max_length=100)
    contact_name: Optional[str] = Field(default=None, max_length=200)
    contact_title: Optional[str] = Field(default=None, max_length=150)
    business_email: Optional[EmailStr] = None
    email_status: str = "unknown"  # valid, verified, invalid, unknown, accept_all
    source_provider: Optional[str] = Field(default="manual_import", max_length=100)
    source_url: Optional[str] = None
    evidence: list[EvidenceInput] = Field(default_factory=list)
    opportunity_type: str = "website_redesign"
    fit_score: Optional[int] = Field(default=75, ge=0, le=100)


class LeadDiscoveryRequest(BaseModel):
    campaign_id: Optional[str] = None
    query: str = Field(min_length=2, max_length=200)
    market: str = "India"
    industry: str = "Startups"
    service_target: str = "Website redesign"
    limit: int = Field(default=5, ge=1, le=20)


class LeadOut(BaseModel):
    id: str
    campaign_id: Optional[str] = None
    company_name: str
    domain: Optional[str] = None
    website_url: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None
    business_email: Optional[str] = None
    email_status: str
    opportunity_type: str
    fit_score: int
    status: str
    source_provider: Optional[str] = None
    created_at: datetime
    evidence: list[EvidenceOut] = Field(default_factory=list)
    audit: Optional[WebsiteAuditOut] = None
    has_draft: bool = False
    draft_status: Optional[str] = None


# ===================== DRAFT & APPROVAL SCHEMAS =====================

class DraftGenerate(BaseModel):
    lead_id: str
    service_offer: str = Field(default="Custom modern web development and conversion optimization", min_length=5, max_length=500)
    tone: str = "professional, direct, and evidence-backed"


class DraftUpdate(BaseModel):
    subject: Optional[str] = None
    body_text: Optional[str] = None


class EmailDraftOut(BaseModel):
    id: str
    lead_id: str
    company_name: str
    contact_name: Optional[str] = None
    business_email: Optional[str] = None
    email_status: str
    subject: str
    body_text: str
    evidence_urls: list[str] = Field(default_factory=list)
    confidence: float
    model: str
    status: str  # pending_review, approved, rejected, sent
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    reply_count: int = 0
    last_reply_snippet: Optional[str] = None
    provider_message_id: Optional[str] = None
    generated_at: datetime


class RecordReplyRequest(BaseModel):
    reply_text: str = Field(min_length=1, max_length=5000)
    sender_email: Optional[str] = None
    notes: Optional[str] = None


class ApproveDraft(BaseModel):
    approved_by: str = Field(min_length=1, max_length=200)
    confirm_exact_recipient_and_content: bool
    recipient_email: Optional[str] = None


class BatchApproveRequest(BaseModel):
    draft_ids: list[str]
    approved_by: str = "Reviewer"
    confirm_all: bool


class SendDraftResponse(BaseModel):
    status: str
    detail: str
    draft_id: str
    provider_message_id: Optional[str] = None


class AutoDispatchResponse(BaseModel):
    status: str
    lead_id: str
    company_name: str
    recipient_email: str
    draft_id: str
    detail: str
    provider_message_id: Optional[str] = None


class BatchAutoDispatchRequest(BaseModel):
    lead_ids: Optional[list[str]] = None
    limit: int = 10


# ===================== SUPPRESSION & INTEGRATION =====================

class SuppressionCreate(BaseModel):
    email_or_domain: str = Field(min_length=3, max_length=255)
    reason: str = Field(default="opt_out", max_length=100)  # opt_out, bounce, spam_complaint, manual
    source: str = Field(default="admin", max_length=100)


class SuppressionOut(BaseModel):
    id: str
    email_normalized: str
    domain_normalized: Optional[str] = None
    reason: str
    source: str
    created_at: datetime


class IntegrationConfig(BaseModel):
    provider_name: str
    api_key: str = ""
    is_active: bool = True
    config: dict[str, Any] = Field(default_factory=dict)


class IntegrationStatusOut(BaseModel):
    provider_name: str
    is_active: bool
    is_configured: bool
    last_tested: Optional[datetime] = None
    status_message: str


# ===================== ANALYTICS & SYSTEM =====================

class AnalyticsSummary(BaseModel):
    total_campaigns: int
    total_leads: int
    qualified_leads: int
    audited_websites: int
    verified_contacts: int
    pending_drafts: int
    approved_drafts: int
    sent_emails: int
    replied_emails: int = 0
    reply_rate: float = 0.0
    suppressed_count: int
    conversion_rate: float


class ApiStatus(BaseModel):
    status: str
    app: str
    version: str
    environment: str
    database: str
    email_sending_enabled: bool
    notes: list[str] = Field(default_factory=list)


# ===================== WEBHOOKS & OAUTH SCHEMAS =====================

class EmailEventWebhookPayload(BaseModel):
    draft_id: str
    event_type: str = Field(description="sent, delivered, opened, clicked, replied, bounced, opted_out")
    recipient_email: Optional[str] = None
    provider_message_id: Optional[str] = None
    details: dict[str, Any] = Field(default_factory=dict)


class OAuthCallbackPayload(BaseModel):
    code: str
    state: Optional[str] = None
    provider: str = "gmail"


class GoogleAuthVerifyRequest(BaseModel):
    credential: str = Field(description="Google OAuth ID Token JWT from Google Sign-In")


class GoogleAuthVerifyResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class AutomationRunResponse(BaseModel):
    status: str
    active_campaigns: int
    discovered_leads: int
    dispatched_emails: int
    replies_detected: int
    notification_target: str
    executed_at: str


