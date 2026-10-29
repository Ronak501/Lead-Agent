import logging
import re
from typing import Any
import httpx
from ..config import settings

logger = logging.getLogger("leadpilot.verification")

# RFC 5322 standard email regex
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)

DISPOSABLE_DOMAINS = {
    "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
    "sharklasers.com", "throwawaymail.com", "yopmail.com", "trashmail.com",
    "dispostable.com", "getairmail.com", "fakemailgenerator.com",
}


class EmailVerificationProvider:
    """Verifies professional email addresses using RFC syntax, DNS MX validation, and Hunter API."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.HUNTER_API_KEY

    async def verify(self, email: str | None) -> dict[str, Any]:
        if not email or not isinstance(email, str):
            return {
                "email": None,
                "status": "unknown",
                "score": 0,
                "reason": "No email provided for verification",
                "provider": "leadpilot_validator",
            }

        email = email.strip().lower()

        # Step 1: Syntax Validation (RFC 5322)
        if not EMAIL_REGEX.match(email):
            return {
                "email": email,
                "status": "invalid",
                "score": 0,
                "reason": "Malformed email address (fails RFC 5322 syntax)",
                "provider": "leadpilot_validator",
            }

        domain = email.split("@")[1]

        # Step 2: Disposable Domain Detection
        if domain in DISPOSABLE_DOMAINS:
            return {
                "email": email,
                "status": "invalid",
                "score": 5,
                "reason": f"Domain '{domain}' is a known temporary/disposable email service",
                "provider": "leadpilot_validator",
            }

        # Step 3: Authoritative Hunter.io Verification (if configured)
        if self.api_key and self.api_key != "mock_key":
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(
                        f"https://api.hunter.io/v2/email-verifier?email={email}&api_key={self.api_key}"
                    )
                    if resp.status_code == 200:
                        data = resp.json().get("data", {})
                        hunter_status = data.get("status", "unknown")  # valid, invalid, accept_all, webmail
                        score = data.get("score", 50)
                        return {
                            "email": email,
                            "status": "verified" if hunter_status == "valid" else ("valid" if hunter_status == "accept_all" else hunter_status),
                            "score": score,
                            "reason": f"Hunter.io verification: {hunter_status} (Score {score}%)",
                            "provider": "hunter_io",
                        }
            except Exception as e:
                logger.warning(f"Hunter.io API check failed: {e}")

        # Step 4: Real DNS MX Record Lookup via DNS-over-HTTPS
        has_mx, mx_details = await self._check_dns_mx(domain)
        if not has_mx:
            return {
                "email": email,
                "status": "invalid",
                "score": 15,
                "reason": f"Domain '{domain}' has no active DNS MX mail servers",
                "provider": "dns_mx_check",
            }

        # Step 5: Deliverability assessment without authoritative API
        # Marked as 'valid' (syntax and MX exist), NEVER falsely marked as 'verified' without provider confirmation
        return {
            "email": email,
            "status": "valid",
            "score": 75,
            "reason": f"Valid syntax and active MX mail server ({mx_details})",
            "provider": "dns_mx_check",
        }

    async def _check_dns_mx(self, domain: str) -> tuple[bool, str]:
        """Resolves DNS MX records via DoH (DNS-over-HTTPS) for firewall-safe lookup."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"https://dns.google/resolve?name={domain}&type=MX",
                    headers={"Accept": "application/dns-json"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    answers = data.get("Answer", [])
                    mx_records = [a.get("data") for a in answers if a.get("type") == 15]
                    if mx_records:
                        return True, mx_records[0].split()[-1]

                # Fallback to Cloudflare DoH
                cf_resp = await client.get(
                    f"https://cloudflare-dns.com/dns-query?name={domain}&type=MX",
                    headers={"Accept": "application/dns-json"},
                )
                if cf_resp.status_code == 200:
                    cf_data = cf_resp.json()
                    cf_answers = cf_data.get("Answer", [])
                    cf_mx = [a.get("data") for a in cf_answers if a.get("type") == 15]
                    if cf_mx:
                        return True, cf_mx[0].split()[-1]
        except Exception as e:
            logger.warning(f"DoH MX lookup failed for {domain}: {e}")

        return False, "No MX records found"
