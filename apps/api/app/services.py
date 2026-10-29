from typing import Any
from .schemas import Lead, EmailDraft


class ProviderNotConfigured(RuntimeError):
    pass


class CompanyDiscoveryProvider:
    """Implement with an approved search API or licensed company-data provider."""
    async def search(self, query: str, market: str, limit: int = 25) -> list[dict[str, Any]]:
        raise ProviderNotConfigured("No company discovery provider configured. Add an approved provider adapter.")


class ContactEnrichmentProvider:
    """Must return sourced contact records; do not guess email addresses."""
    async def find_contacts(self, domain: str, roles: list[str]) -> list[dict[str, Any]]:
        raise ProviderNotConfigured("No contact enrichment provider configured.")


class EmailVerificationProvider:
    async def verify(self, email: str) -> dict[str, Any]:
        raise ProviderNotConfigured("No email verification provider configured.")


class WebsiteAuditProvider:
    async def audit(self, url: str) -> dict[str, Any]:
        raise ProviderNotConfigured("No website audit provider configured.")


class EmailDraftProvider:
    """Safe placeholder generator. Replace with an LLM and require evidence grounding."""
    async def generate(self, lead: Lead, service_offer: str, tone: str) -> EmailDraft:
        company = lead.company_name
        evidence_urls = [str(item.source_url) for item in lead.evidence]
        if not lead.evidence:
            observation = "I came across your company while researching businesses in your space"
        else:
            observation = lead.evidence[0].excerpt.strip()
        subject = f"An idea for {company}'s web presence"
        body = (
            f"Hi {lead.contact_name or 'there'},\n\n"
            f"{observation}. I work on {service_offer.strip()}. "
            "If improving your web presence or building a tailored product is on your roadmap, "
            "would a short conversation be useful?\n\n"
            "If this is not relevant, let me know and I will not follow up.\n\n"
            "Best regards,\nRonak Talaviya\nFounder, Ornitech Solutions\nhttps://ornitech.in"
        )
        return EmailDraft(
            lead_id=lead.id,
            subject=subject,
            body_text=body,
            evidence_urls=evidence_urls,
            confidence=0.35 if not lead.evidence else min(0.8, lead.evidence[0].confidence),
        )


class EmailSender:
    async def send(self, draft: EmailDraft, lead: Lead) -> str:
        raise ProviderNotConfigured("Email sending is disabled until a provider adapter and safety checks are configured.")
