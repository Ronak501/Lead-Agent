import ipaddress
import logging
import socket
import time
from typing import Any
from urllib.parse import urlparse, urljoin
import httpx
from bs4 import BeautifulSoup
from ..config import settings

logger = logging.getLogger("leadpilot.website_analyzer")

BLOCKED_HOSTNAMES = {
    "localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal",
    "169.254.169.254", "instance-data",
}


def is_ssrf_safe(url: str) -> tuple[bool, str]:
    """Validates target URL against SSRF attacks targeting localhost, private subnets, and cloud metadata."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, f"Unsupported scheme: {parsed.scheme}"

        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL host"

        if hostname.lower() in BLOCKED_HOSTNAMES:
            return False, "Access to localhost, loopback, or cloud metadata is strictly forbidden"

        # Resolve IP and check if private/loopback/link-local/multicast/reserved
        try:
            ip_str = socket.gethostbyname(hostname)
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False, f"Access to private/local network address ({ip_str}) is blocked"
        except socket.gaierror:
            return False, "Target domain does not resolve to an active IP address"

        return True, ""
    except Exception as e:
        return False, f"SSRF check failed: {e}"


class WebsiteAuditProvider:
    """Live website analyzer capturing factual observations, separated from inferred opportunities."""

    async def audit(self, url: str) -> dict[str, Any]:
        normalized_url = url.strip()
        if not normalized_url.startswith(("http://", "https://")):
            normalized_url = "https://" + normalized_url

        safe, reason = is_ssrf_safe(normalized_url)
        if not safe:
            logger.warning(f"Blocked SSRF attempt on {normalized_url}: {reason}")
            return {
                "status_code": 403,
                "title": "Blocked by Security Policy",
                "meta_description": reason,
                "tech_stack": ["Blocked"],
                "issues_found": [f"Security Policy: {reason}"],
                "opportunity_summary": "Website could not be audited due to SSRF / internal address protection.",
                "performance_score": 0,
            }

        start_time = time.time()
        status_code = 0
        title = ""
        meta_description = ""
        tech_stack = []
        factual_observations = []
        inferred_opportunities = []
        html_text = ""
        performance_score = 75

        # SSRF-safe redirect hook
        async def on_response(response: httpx.Response):
            if response.is_redirect:
                redirect_url = response.headers.get("location")
                if redirect_url:
                    full_redirect = urljoin(str(response.url), redirect_url)
                    r_safe, r_reason = is_ssrf_safe(full_redirect)
                    if not r_safe:
                        raise httpx.RequestError(f"Blocked unsafe redirect to {full_redirect}: {r_reason}")

        try:
            async with httpx.AsyncClient(
                timeout=10.0,
                follow_redirects=True,
                event_hooks={"response": [on_response]},
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LeadPilotAudit/1.0"
                },
                verify=False,
            ) as client:
                response = await client.get(normalized_url)
                status_code = response.status_code
                elapsed = time.time() - start_time
                html_text = response.text
        except Exception as exc:
            elapsed = time.time() - start_time
            logger.warning(f"Failed to fetch {normalized_url}: {exc}")
            return {
                "status_code": status_code or 500,
                "title": "Domain Unreachable",
                "meta_description": "Failed to connect to web server",
                "tech_stack": ["Unknown"],
                "issues_found": [f"Connection error or timeout: {str(exc)[:120]}"],
                "opportunity_summary": "Website is either unreachable, slow to respond, or experiencing DNS/SSL issues.",
                "performance_score": 30,
            }

        # Parse DOM
        soup = BeautifulSoup(html_text, "html.parser")

        # 1. Title
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            title = title_tag.string.strip()
        else:
            factual_observations.append("Missing <title> tag on homepage")

        # 2. Meta description
        meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if meta_desc and meta_desc.get("content"):
            meta_description = meta_desc.get("content", "").strip()
        else:
            factual_observations.append("Missing meta description tag for search indexing")

        # 3. Viewport (mobile responsiveness)
        viewport = soup.find("meta", attrs={"name": "viewport"})
        if not viewport:
            factual_observations.append("Missing responsive viewport meta tag (fails mobile usability)")
            inferred_opportunities.append("Opportunity: Implement responsive viewport layout to capture mobile traffic")
            performance_score -= 20

        # 4. Latency
        if elapsed > 2.5:
            factual_observations.append(f"Server response latency: {elapsed:.2f}s (above Google's recommended 0.8s threshold)")
            inferred_opportunities.append("Opportunity: Next.js edge caching and asset minification to achieve sub-second TTFB")
            performance_score -= 15
        elif elapsed < 1.0:
            performance_score += 10

        # 5. Technology detection
        html_lower = html_text.lower()
        if "wp-content" in html_lower or "wordpress" in html_lower:
            tech_stack.append("WordPress")
            factual_observations.append("Legacy WordPress installation detected in asset paths")
            inferred_opportunities.append("Opportunity: Headless Next.js migration for faster load times and modern security")
        if "shopify" in html_lower:
            tech_stack.append("Shopify")
        if "wix.com" in html_lower:
            tech_stack.append("Wix")
            factual_observations.append("Static Wix template footprint identified")
        if "squarespace" in html_lower:
            tech_stack.append("Squarespace")
        if "react" in html_lower or "_next" in html_lower:
            tech_stack.append("React / Next.js")
        if "jquery" in html_lower:
            tech_stack.append("jQuery")

        # 6. Form / CTA analysis
        buttons = soup.find_all(["button", "a"])
        has_cta = any("contact" in b.get_text().lower() or "book" in b.get_text().lower() or "demo" in b.get_text().lower() for b in buttons)
        if not has_cta:
            factual_observations.append("Absence of clear primary conversion CTA button (Contact, Book Demo, or Quote)")
            inferred_opportunities.append("Opportunity: Add prominent lead capture funnels to increase visitor conversion")
            performance_score -= 10

        # 7. Optional Google PageSpeed Insights Check
        pagespeed_metrics = await self._check_pagespeed(normalized_url)
        if pagespeed_metrics:
            score = pagespeed_metrics.get("score")
            if score is not None:
                performance_score = score
                factual_observations.append(f"Google PageSpeed mobile performance score: {score}/100")

        # Opportunity Summary separating observations from inferences
        if not factual_observations:
            opportunity_summary = "Website infrastructure is healthy. Opportunity lies in custom SaaS tooling, feature expansion, or dedicated landing funnels."
        else:
            opportunity_summary = (
                f"Factual observations ({len(factual_observations)}): " + "; ".join(factual_observations[:2]) + ". " +
                f"Inferred opportunities: " + ("; ".join(inferred_opportunities[:2]) if inferred_opportunities else "Next.js modernization.")
            )

        return {
            "status_code": status_code,
            "title": title[:280],
            "meta_description": meta_description[:500],
            "tech_stack": list(set(tech_stack)) or ["Custom HTML/CSS"],
            "issues_found": factual_observations + inferred_opportunities,
            "opportunity_summary": opportunity_summary,
            "performance_score": max(20, min(95, performance_score)),
        }

    async def _check_pagespeed(self, url: str) -> dict[str, Any] | None:
        """Queries Google PageSpeed Insights API if available."""
        try:
            api_url = f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&strategy=mobile"
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(api_url)
                if resp.status_code == 200:
                    data = resp.json()
                    lighthouse = data.get("lighthouseResult", {})
                    cats = lighthouse.get("categories", {})
                    perf = cats.get("performance", {})
                    score_raw = perf.get("score")
                    if score_raw is not None:
                        return {"score": int(score_raw * 100)}
        except Exception:
            pass
        return None
