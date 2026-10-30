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
        angle: str = "A",
    ) -> dict[str, Any]:
        """Creates an evidence-grounded cold email draft supporting A/B split-testing angles (Angle A: Technical/Speed, Angle B: Conversion/ROI)."""

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

        angle_focus = (
            "Focus on technical debt, website latency, bug resolution, and on-demand tech support / dev bandwidth (Angle A: Tech Support & Engineering Velocity)."
            if angle == "A"
            else "Focus on mobile user experience friction, checkout/conversion rate drop-offs, and scaling customer retention (Angle B: Conversion & Growth)."
        )

        prompt = f"""You are an elite B2B copywriter representing Ornitech Solutions ({sender_website}), an agile software engineering & dedicated tech support partner for high-growth startups and modern digital brands.
Follow these STRICT rules:
1. Target Audience: The recipient is a busy startup founder, CEO, or technical decision-maker. They are strapped for engineering bandwidth and value fast, reliable execution.
2. Core Pitch: We provide on-demand developer pods, Next.js/React web & mobile app engineering, and 24/7 technical support—helping lean startup teams ship features 40% faster and eliminate tech debt without hiring expensive in-house headcount.
3. Ground the opening observation directly in this verified evidence: "{observation}".
4. Pitch Strategy: {angle_focus}
5. Keep the email under 100 words. Direct, respectful, conversational, and tailored to a startup founder.
6. Pitch this specific capability: "{service_offer}".
7. Tone: {tone}.
8. Include a low-friction question at the end (e.g. "Would you be open to a 10-minute chat this week, or should I send a 2-minute Loom teardown with ideas for {company_name}?").
9. Add an opt-out line: "If this isn't relevant right now, reply 'pass' and I won't follow up."
10. Sign off the email with this EXACT sender sign-off at the end:
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
                                "model": f"groq/{model_candidate} [Angle {angle}]",
                                "angle": angle,
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

        if angle == "A":
            subject = f"Tech support & dev bandwidth for {company_name}"
            body = (
                f"{recipient_salutation},\n\n"
                f"I was reviewing {company_name}'s web presence at {website_url or 'your site'}. {observation}.\n\n"
                f"At Ornitech Solutions ({sender_website}), we act as an agile, on-demand engineering & 24/7 tech support partner for fast-growing startups. We help lean teams ship new features faster, resolve tech debt, and keep web & mobile platforms at peak performance without the high cost of hiring full-time senior developers.\n\n"
                f"Would you be open to a quick 10-minute chat this week, or should I send a 2-minute Loom teardown with specific suggestions for {company_name}?\n\n"
                "If this isn't a priority right now, just reply 'pass' and I will not follow up.\n\n"
                "Best regards,\n"
                f"{sender_name}\n"
                f"{sender_title}\n"
                f"{sender_website}"
            )
        else:
            subject = f"Quick idea to optimize {company_name}'s site performance & conversion"
            body = (
                f"{recipient_salutation},\n\n"
                f"I came across {company_name} and took a close look at your website. {observation}.\n\n"
                f"We specialize in {service_offer.strip().lower()} at Ornitech Solutions ({sender_website}). We help modern startups and digital brands eliminate mobile friction, boost page speeds, and convert more visitors into active customers.\n\n"
                f"Would you be open to a 10-minute intro call next week, or would you prefer a quick 2-minute video walkthrough of what we'd improve?\n\n"
                "If this isn't relevant right now, reply 'pass' and I will not follow up.\n\n"
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
            "angle": angle,
        }

    async def classify_reply_and_suggest(
        self,
        reply_text: str,
        sender_name: str | None = None,
        company_name: str | None = None,
        booking_url: str | None = None,
    ) -> dict[str, Any]:
        """Analyzes an incoming cold email reply using Groq AI, determines intent and sentiment, and drafts a high-converting response."""
        cal_url = booking_url or "https://cal.com/ornitech/intro"
        our_name = settings.SENDER_NAME or "Ronak Talaviya"
        our_company = settings.SENDER_COMPANY or "Founder, Ornitech Solutions"
        our_website = settings.SENDER_WEBSITE or "https://ornitech.in"
        prospect_name = sender_name or "there"

        # Check for immediate unsubscribe / opt-out cues
        lower_reply = reply_text.lower()
        unsub_cues = ["unsubscribe", "remove me", "take me off", "stop emailing", "spam", "not interested", "dont contact"]
        is_opt_out = any(cue in lower_reply for cue in unsub_cues)

        prompt = f"""You are an elite B2B sales development AI assistant.
Analyze this incoming prospect email reply and provide a structured classification and a courteous response.

Context:
- Prospect Name: {prospect_name}
- Prospect Company: {company_name or 'their company'}
- Our Founder: {our_name} ({our_company}, {our_website})
- Our Calendar Booking Link: {cal_url}

Incoming Prospect Reply:
\"\"\"{reply_text.strip()}\"\"\"

Instructions:
1. Classify sentiment: "positive", "objection", "neutral", "out_of_office", or "unsubscribe".
2. Classify intent: "meeting_request", "more_info", "pricing_inquiry", "objection", "unsubscribe", or "out_of_office".
3. If the prospect is interested, asking for a meeting, or curious, draft an enthusiastic, brief response (under 60 words) providing the calendar link {cal_url}.
4. If the prospect requests to be removed or is hostile, set should_suppress to true and draft a polite 1-sentence confirmation that they will never be contacted again.
5. If it's an objection (e.g. 'we have an in-house team'), draft a polite, value-adding response acknowledging it without being pushy.

Respond ONLY with a JSON object in this exact schema:
{{
  "sentiment": "positive",
  "intent": "meeting_request",
  "confidence": 0.95,
  "summary": "One sentence summary of prospect's intent",
  "should_suppress": false,
  "suggested_reply": "Exact ready-to-send reply text with signature"
}}"""

        if self.groq_key and self.groq_key != "mock_key":
            preferred_model = self.groq_model or "openai/gpt-oss-120b"
            candidates = [preferred_model, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile"]
            unique_candidates = []
            for m in candidates:
                if m and m not in unique_candidates:
                    unique_candidates.append(m)

            for model in unique_candidates:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {self.groq_key}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "model": model,
                                "messages": [
                                    {
                                        "role": "system",
                                        "content": "You are a professional B2B email sentiment and reply assistant. Always return valid JSON format.",
                                    },
                                    {"role": "user", "content": prompt},
                                ],
                                "response_format": {"type": "json_object"},
                                "temperature": 0.2,
                                "max_tokens": 400,
                            },
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            parsed = json.loads(data["choices"][0]["message"]["content"])
                            return {
                                "sentiment": parsed.get("sentiment", "positive" if not is_opt_out else "unsubscribe"),
                                "intent": parsed.get("intent", "meeting_request" if not is_opt_out else "unsubscribe"),
                                "confidence": float(parsed.get("confidence", 0.90)),
                                "summary": parsed.get("summary", "Prospect responded to outreach email."),
                                "should_suppress": bool(parsed.get("should_suppress", is_opt_out)),
                                "suggested_reply": parsed.get("suggested_reply", "").strip(),
                            }
                except Exception as e:
                    logger.warning(f"Groq reply classification with {model} failed: {e}. Trying fallback.")

        # Heuristic Rule-Based Fallback
        if is_opt_out:
            return {
                "sentiment": "unsubscribe",
                "intent": "unsubscribe",
                "confidence": 0.98,
                "summary": "Prospect requested to be removed from outreach list.",
                "should_suppress": True,
                "suggested_reply": (
                    f"Hi {prospect_name},\n\n"
                    "Understood completely. I have removed your email and company from our contact list and you will not receive any further emails.\n\n"
                    f"Best regards,\n{our_name}\n{our_company}"
                ),
            }

        # Check positive cues
        positive_cues = ["interested", "call", "meet", "schedule", "zoom", "pricing", "cost", "proposal", "send details", "lets talk", "sure"]
        if any(cue in lower_reply for cue in positive_cues):
            return {
                "sentiment": "positive",
                "intent": "meeting_request",
                "confidence": 0.92,
                "summary": "Prospect showed positive interest or requested a meeting/pricing.",
                "should_suppress": False,
                "suggested_reply": (
                    f"Hi {prospect_name},\n\n"
                    "Thanks for getting back to me! I would be glad to share more details and walk you through what we found.\n\n"
                    f"Would you like to pick a quick 10-minute slot on my calendar here? {cal_url}\n\n"
                    "Looking forward to connecting!\n\n"
                    f"Best regards,\n{our_name}\n{our_company}\n{our_website}"
                ),
            }

        # Default Neutral
        return {
            "sentiment": "neutral",
            "intent": "more_info",
            "confidence": 0.75,
            "summary": "Prospect acknowledged email with general response.",
            "should_suppress": False,
            "suggested_reply": (
                f"Hi {prospect_name},\n\n"
                "Thanks for following up! Happy to answer any questions or share a quick 2-minute overview.\n\n"
                f"Feel free to grab a time that suits you here: {cal_url}\n\n"
                f"Best regards,\n{our_name}\n{our_company}\n{our_website}"
            ),
        }

    async def generate_followup_draft(
        self,
        company_name: str,
        contact_name: str | None,
        contact_title: str | None,
        original_subject: str,
        service_offer: str,
        step: int = 1,
    ) -> dict[str, Any]:
        """Generates a high-converting, concise multi-touch follow-up draft (Step 1 = 3-day bump; Step 2 = 7-day breakup)."""
        our_name = settings.SENDER_NAME or "Ronak Talaviya"
        our_company = settings.SENDER_COMPANY or "Founder, Ornitech Solutions"
        our_website = settings.SENDER_WEBSITE or "https://ornitech.in"
        first_name = contact_name.split()[0] if contact_name else "there"

        # Threaded subject line
        subject = original_subject if original_subject.lower().startswith("re:") else f"Re: {original_subject}"

        if step == 1:
            # Step 1: Quick conversational bump (< 50 words)
            body = (
                f"Hi {first_name},\n\n"
                f"Wanted to quickly bump my note below in case it got buried. We recently helped another team in your space upgrade their site speed and conversion stack.\n\n"
                f"Would you be open to a 5-minute look at the opportunities we spotted for {company_name}?\n\n"
                f"Best regards,\n{our_name}\n{our_company}\n{our_website}"
            )
        else:
            # Step 2: Graceful breakup note (< 40 words)
            body = (
                f"Hi {first_name},\n\n"
                f"I assume improving {company_name}'s web performance isn't a priority right now, so I won't follow up again.\n\n"
                f"If things change down the road, feel free to reach out anytime at {our_website}.\n\n"
                f"Wishing you and the team continued success!\n\n"
                f"Best regards,\n{our_name}\n{our_company}"
            )

        return {
            "subject": subject,
            "body_text": body,
            "confidence": 0.95,
            "model": "grounded-followup-engine",
        }

    @staticmethod
    def compute_content_hash(subject: str, body_text: str) -> str:
        """Computes SHA256 of exact approved draft content to prevent tampering."""
        raw = f"{subject.strip()}\n---\n{body_text.strip()}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()
