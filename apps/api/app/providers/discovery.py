import logging
import re
from typing import Any
from urllib.parse import urlparse, unquote
import httpx
from bs4 import BeautifulSoup
from ..config import settings
from ..models import normalize_domain

logger = logging.getLogger("leadpilot.discovery")

BLOCKED_SEARCH_DOMAINS = {
    "google.com", "duckduckgo.com", "bing.com", "yahoo.com",
    "facebook.com", "twitter.com", "x.com", "linkedin.com",
    "instagram.com", "youtube.com", "wikipedia.org", "reddit.com",
    "quora.com", "medium.com", "github.com", "amazon.com",
}


class ProviderNotConfiguredException(Exception):
    """Raised when an external discovery or enrichment provider is required but not configured."""
    pass


class CompanyDiscoveryProvider:
    """Discovers real companies, verifiable domains, and public business evidence."""

    def __init__(self, apollo_key: str | None = None):
        self.apollo_key = apollo_key if apollo_key is not None else settings.APOLLO_API_KEY

    async def search(
        self,
        query: str,
        market: str = "India",
        industry: str = "Startups",
        service_target: str = "Website redesign",
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Executes a search for real business prospects across configured providers."""

        # 1. Primary Strategy: Apollo API (if configured)
        if self.apollo_key and self.apollo_key != "mock_key":
            apollo_results = await self._search_apollo(query, market, industry, service_target, limit)
            if apollo_results:
                return apollo_results

        # 2. Secondary Strategy: Public Web Search Engine (Live crawler)
        web_results = await self._search_web(query, market, industry, service_target, limit)
        if web_results:
            return web_results

        # 3. If neither provider is available or both return empty results
        if not self.apollo_key:
            raise ProviderNotConfiguredException(
                "No active discovery provider is configured. Please add an Apollo API key (APOLLO_API_KEY) "
                "or connect your discovery integration in the Integrations tab to discover live businesses."
            )

        return []

    async def _search_apollo(
        self,
        query: str,
        market: str,
        industry: str,
        service_target: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        """Queries Apollo Mixed People & Organizations API."""
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(
                    "https://api.apollo.io/v1/mixed_people/search",
                    json={
                        "api_key": self.apollo_key,
                        "q_organization_keyword_tags": [query, industry],
                        "person_locations": [market] if market != "Global" else [],
                        "page": 1,
                        "per_page": limit,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    results = []
                    people = data.get("people", [])
                    organizations = data.get("organizations", [])

                    # Map orgs by id
                    org_map = {o.get("id"): o for o in organizations if o.get("id")}

                    if people:
                        for p in people[:limit]:
                            org_id = p.get("organization_id")
                            org = org_map.get(org_id, {})
                            raw_domain = org.get("primary_domain") or p.get("organization", {}).get("primary_domain")
                            norm_dom = normalize_domain(raw_domain)
                            if not norm_dom:
                                continue

                            first_name = p.get("first_name", "")
                            last_name = p.get("last_name", "")
                            contact_name = f"{first_name} {last_name}".strip() or None
                            title = p.get("title") or "Decision Maker"
                            raw_email = p.get("email")

                            results.append({
                                "company_name": org.get("name") or p.get("organization_name") or norm_dom.split(".")[0].title(),
                                "domain": norm_dom,
                                "website_url": f"https://{norm_dom}",
                                "country": market,
                                "industry": org.get("industry") or industry,
                                "contact_name": contact_name,
                                "contact_title": title,
                                "business_email": raw_email.lower().strip() if raw_email else None,
                                "email_status": "verified" if (raw_email and p.get("email_status") == "verified") else "unknown",
                                "source_provider": "apollo_api",
                                "source_url": f"https://{norm_dom}",
                                "opportunity_type": service_target.lower().replace(" ", "_"),
                                "evidence_excerpt": f"Verified organizational profile for {org.get('name', norm_dom)} in {industry} ({market}).",
                                "fit_score": 85,
                            })
                        if results:
                            return results

                    # If people array was empty, use organizations array
                    for org in organizations[:limit]:
                        raw_domain = org.get("primary_domain")
                        norm_dom = normalize_domain(raw_domain)
                        if not norm_dom:
                            continue

                        results.append({
                            "company_name": org.get("name") or norm_dom.split(".")[0].title(),
                            "domain": norm_dom,
                            "website_url": f"https://{norm_dom}",
                            "country": market,
                            "industry": org.get("industry") or industry,
                            "contact_name": None,
                            "contact_title": "Founder / Product Lead",
                            "business_email": None,
                            "email_status": "unknown",
                            "source_provider": "apollo_api",
                            "source_url": f"https://{norm_dom}",
                            "opportunity_type": service_target.lower().replace(" ", "_"),
                            "evidence_excerpt": f"Verified organization registered in {industry} market ({market}) with active domain {norm_dom}.",
                            "fit_score": 80,
                        })
                    if results:
                        return results
        except Exception as e:
            logger.warning(f"Apollo API request failed: {e}")
        return []

    async def _search_web(
        self,
        query: str,
        market: str,
        industry: str,
        service_target: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        """Live web search to discover real company domains and public snippets."""
        search_terms = f"{query} {industry} company website {market}".strip()
        search_url = f"https://html.duckduckgo.com/html/?q={search_terms}"

        try:
            async with httpx.AsyncClient(
                timeout=10.0,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
            ) as client:
                resp = await client.get(search_url)
                if resp.status_code != 200:
                    return []

                soup = BeautifulSoup(resp.text, "html.parser")
                results = []
                seen_domains = set()

                for result in soup.select(".result"):
                    title_elem = result.select_one(".result__title a")
                    snippet_elem = result.select_one(".result__snippet")
                    if not title_elem:
                        continue

                    raw_href = title_elem.get("href", "")
                    # Extract target URL from DuckDuckGo redirect
                    if "uddg=" in raw_href:
                        match = re.search(r"uddg=([^&]+)", raw_href)
                        if match:
                            target_url = unquote(match.group(1))
                        else:
                            target_url = raw_href
                    else:
                        target_url = raw_href

                    parsed = urlparse(target_url)
                    norm_domain = normalize_domain(parsed.netloc or parsed.path)

                    if not norm_domain or norm_domain in BLOCKED_SEARCH_DOMAINS or norm_domain in seen_domains:
                        continue

                    # Filter out major platforms or search engines
                    if any(blocked in norm_domain for blocked in ["google.", "duckduckgo.", "linkedin.", "wikipedia."]):
                        continue

                    seen_domains.add(norm_domain)
                    title_text = title_elem.get_text(strip=True)
                    snippet_text = snippet_elem.get_text(strip=True) if snippet_elem else f"Company active at {norm_domain}"

                    company_name = title_text.split(" - ")[0].split(" | ")[0].split(" : ")[0].strip()
                    if len(company_name) > 40 or not company_name:
                        company_name = norm_domain.split(".")[0].title()

                    results.append({
                        "company_name": company_name,
                        "domain": norm_domain,
                        "website_url": f"https://{norm_domain}",
                        "country": market,
                        "industry": industry,
                        "contact_name": None,
                        "contact_title": "Founder / Head of Digital",
                        "business_email": None,
                        "email_status": "unknown",
                        "source_provider": "web_search_crawler",
                        "source_url": target_url,
                        "opportunity_type": service_target.lower().replace(" ", "_"),
                        "evidence_excerpt": snippet_text[:200],
                        "fit_score": 78,
                    })

                    if len(results) >= limit:
                        break

                return results
        except Exception as e:
            logger.warning(f"Web search discovery failed: {e}")
            return []
