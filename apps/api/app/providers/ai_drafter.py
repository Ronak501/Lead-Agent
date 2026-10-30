import hashlib
import json
import logging
from typing import Any
import httpx
from ..config import settings

logger = logging.getLogger("leadpilot.ai_drafter")


class EmailDraftProvider:
    """Generates evidence-grounded personalized outreach drafts using Groq LPUs (Llama 3.3/3.1) or Gemini."""

    def __init__(self, groq_key: str | None = None, gemini_key: str | None = None):
        self.groq_key = groq_key if groq_key is not None else settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_MODEL or "llama-3.1-8b-instant"
        self.gemini_key = gemini_key if gemini_key is not None else settings.GEMINI_API_KEY

    async def generate(
        self,
        company_name: str,
        contact_name: str | None,
        contact_title: str | None,
        website_url: str | None,
        service_offer: str,
        tone: str,
        evidence_list: list[dict[str, Any]],
        audit_findings: list[str] | None = None,
    ) -> dict[str, Any]:
        """Creates an evidence-grounded cold email draft."""

        evidence_urls = [e.get("source_url") for e in evidence_list if e.get("source_url")]
        evidence_excerpts = [e.get("excerpt", "") for e in evidence_list if e.get("excerpt")]
        audit_summary = "; ".join(audit_findings[:2]) if audit_findings else ""

        # Primary observation from verified evidence
        if evidence_excerpts:
            observation = evidence_excerpts[0].strip()
        elif audit_summary:
            observation = f"Observed website findings: {audit_summary}"
        else:
            observation = f"I was reviewing {company_name}'s web presence at {website_url or 'your website'}"

        sender_name = settings.SENDER_NAME or "Ronak Talaviya"
        sender_title = settings.SENDER_COMPANY or "Founder, Ornitech Solutions"
        sender_website = settings.SENDER_WEBSITE or "https://ornitech.in"

        prompt = f"""You are an expert B2B copywriter for high-converting, human-approved cold emails.
Follow these STRICT rules:
1. NEVER invent facts, metrics, fake clients, or imaginary mutual acquaintances.
2. Ground the opening observation directly in this verified evidence: "{observation}".
3. Keep the email under 120 words. Direct, respectful, conversational.
4. Pitch this specific capability: "{service_offer}".
5. Tone: {tone}.
6. Include a low-friction question at the end (e.g. "Would you be open to a 10-minute chat or should I send a 2-minute Loom teardown?").
7. Add an opt-out line: "If this isn't relevant, just let me know and I won't follow up."
8. Sign off the email with this EXACT sender sign-off at the end:
Best regards,
{sender_name}
{sender_title}
{sender_website}

Recipient:
Name: {contact_name or 'Founder'}
Role: {contact_title or 'Decision Maker'}
Company: {company_name}
Website: {website_url}

Respond ONLY with a JSON object in this exact schema:
{{
  "subject": "Compelling short subject line",
  "body": "Exact email body text",
  "confidence": 0.92
}}"""

        diagnostics = []
        # 1. Primary Strategy: Groq API (Ultra-fast LPU inference with resilient modern model fallback)
        if self.groq_key and self.groq_key != "mock_key":
            preferred_model = self.groq_model or "openai/gpt-oss-120b"
            candidate_models = [
                preferred_model,
                "openai/gpt-oss-120b",
                "openai/gpt-oss-20b",
                "qwen/qwen3.8-27b",
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
            ]
            # Deduplicate preserving order
            unique_candidates = []
            for m in candidate_models:
                if m and m not in unique_candidates:
                    unique_candidates.append(m)

            for model_candidate in unique_candidates:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {self.groq_key}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "model": model_candidate,
                                "messages": [
                                    {
                                        "role": "system",
                                        "content": "You are a professional B2B outreach copywriter. Respond exclusively in valid JSON.",
                                    },
                                    {"role": "user", "content": prompt},
                                ],
                                "response_format": {"type": "json_object"},
                                "temperature": 0.3,
                                "max_tokens": 500,
                            },
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            raw_content = data["choices"][0]["message"]["content"]
                            parsed = json.loads(raw_content)
                            body_content = parsed.get("body", "").strip()
                            # Ensure signature and website presence
                            if sender_name not in body_content or sender_website not in body_content:
                                body_content = f"{body_content}\n\nBest regards,\n{sender_name}\n{sender_title}\n{sender_website}"
                            return {
                                "subject": parsed.get("subject", f"Idea for {company_name}'s web presence"),
                                "body_text": body_content,
                                "evidence_urls": evidence_urls,
                                "confidence": float(parsed.get("confidence", 0.92)),
                                "model": f"groq/{model_candidate}",
                            }
                        elif resp.status_code == 429:
                            err_msg = f"Groq API Rate Limit Reached for key 'GROQ_API_KEY' (model {model_candidate}): {resp.text[:150]}"
                            logger.warning(err_msg)
                            diagnostics.append(f"Rate limit reached on GROQ_API_KEY ({model_candidate})")
                        elif resp.status_code in (401, 403):
                            err_msg = f"Groq API Authentication Error for key 'GROQ_API_KEY': {resp.text[:150]}"
                            logger.warning(err_msg)
                            diagnostics.append("Invalid or unauthorized GROQ_API_KEY")
                        else:
                            logger.warning(
                                f"Groq API model {model_candidate} returned HTTP {resp.status_code}: {resp.text[:100]}. Trying next candidate."
                            )
                except Exception as e:
                    logger.warning(f"Groq API generation with model {model_candidate} failed: {e}.")
                    break  # Break out to avoid spamming network when offline

        # 2. Secondary Strategy: Gemini API (if configured)
        if self.gemini_key and self.gemini_key != "mock_key":
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}",
                        json={
                            "contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"},
                        },
                    )
                    if resp.status_code == 200:
                        content = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                        data = json.loads(content)
                        body_content = data.get("body", "").strip()
                        if sender_name not in body_content or sender_website not in body_content:
                            body_content = f"{body_content}\n\nBest regards,\n{sender_name}\n{sender_title}\n{sender_website}"
                        return {
                            "subject": data.get("subject", f"Idea for {company_name}'s web presence"),
                            "body_text": body_content,
                            "evidence_urls": evidence_urls,
                            "confidence": float(data.get("confidence", 0.88)),
                            "model": "gemini-1.5-flash",
                        }
                    elif resp.status_code == 429:
                        logger.warning(f"Gemini API Rate Limit Reached for key 'GEMINI_API_KEY': {resp.text[:150]}")
                        diagnostics.append("Rate limit reached on GEMINI_API_KEY")
                    elif resp.status_code in (400, 401, 403):
                        logger.warning(f"Gemini API Authentication Error for key 'GEMINI_API_KEY': {resp.text[:150]}")
                        diagnostics.append("Invalid or unauthorized GEMINI_API_KEY")
            except Exception as e:
                logger.warning(f"Gemini API generation failed: {e}.")

        # 3. Grounded Heuristic Template Fallback
        if diagnostics:
            logger.info(f"AI Drafting Fallback active due to provider diagnostics: {'; '.join(diagnostics)}")
        recipient_salutation = f"Hi {contact_name.split()[0]}" if contact_name else "Hi there"
        subject = f"An idea for {company_name}'s web presence"
        body = (
            f"{recipient_salutation},\n\n"
            f"I came across {company_name} and took a look at your website. {observation}.\n\n"
            f"We specialize in {service_offer.strip().lower()} at Ornitech Solutions ({sender_website}), helping modern companies upgrade their tech stack, accelerate page speeds, and improve visitor conversions.\n\n"
            "Would you be open to a quick 10-minute conversation next week, or would you prefer a quick 2-minute video teardown of what we'd improve?\n\n"
            "If this isn't a priority right now, just reply and let me know and I will not follow up.\n\n"
            "Best regards,\n"
            f"{sender_name}\n"
            f"{sender_title}\n"
            f"{sender_website}"
        )

        confidence = 0.85 if evidence_excerpts else 0.70
        return {
            "subject": subject,
            "body_text": body,
            "evidence_urls": evidence_urls,
            "confidence": confidence,
            "model": "grounded-heuristic-engine",
        }

    @staticmethod
    def compute_content_hash(subject: str, body_text: str) -> str:
        """Computes SHA256 of exact approved draft content to prevent tampering."""
        raw = f"{subject.strip()}\n---\n{body_text.strip()}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()
