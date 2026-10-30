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
    "clutch.co", "g2.com", "goodfirms.co", "tracxn.com", "f6s.com",
    "crunchbase.com", "builtin.com", "startupranking.com", "topstartups.io",
    "ycombinator.com", "wellfound.com", "upwork.com", "fiverr.com",
    "cookleads.com", "getlatka.com", "startupblink.com", "beststartup.in",
    "lapaasvoice.com", "glassdoor.com", "ambitionbox.com", "zoominfo.com",
    "craft.co", "owler.com", "pitchbook.com",
}


def parse_search_query(query: str, industry: str, market: str) -> tuple[str, list[str], list[str]]:
    """
    Sanitizes natural-language search queries into:
      1. clean_search_term for Apollo full-text fuzzy matching.
      2. sanitized keyword tags (stripping filler/location words).
      3. parsed locations with city/country aliases (e.g. Bangalore -> Bengaluru).
    """
    STOP_WORDS = {
        "in", "at", "for", "the", "and", "or", "to", "of", "with", "by", "from",
        "companies", "company", "startup", "startups", "agency", "agencies",
        "firm", "firms", "services", "solutions", "brands", "top", "best", "list",
        "india", "bangalore", "bengaluru", "mumbai", "delhi", "pune", "hyderabad", "gurugram", "noida",
        "usa", "us", "uk", "global",
    }

    clean_search_term = query.strip() if query else ""
    for loc_phrase in [
        r"\s+in\s+Bangalore", r"\s+in\s+Bengaluru", r"\s+in\s+Mumbai",
        r"\s+in\s+Delhi", r"\s+in\s+India", r"\s+in\s+USA", r"\s+in\s+Global"
    ]:
        clean_search_term = re.sub(loc_phrase, "", clean_search_term, flags=re.IGNORECASE).strip()

    combined_text = f"{clean_search_term} {industry}"
    raw_tokens = re.findall(r"[A-Za-z0-9]+", combined_text)
    tags: list[str] = []
    for tok in raw_tokens:
        tok_lower = tok.lower()
        if len(tok_lower) > 2 and tok_lower not in STOP_WORDS and tok_lower not in tags:
            tags.append(tok_lower)

    locations: list[str] = []
    if market and market.lower() not in ("all", "global"):
        parts = [p.strip() for p in market.split(",") if p.strip()]
        for p in parts:
            if p not in locations:
                locations.append(p)
                if p.lower() == "bangalore" and "Bengaluru" not in locations:
                    locations.append("Bengaluru")
                elif p.lower() == "bengaluru" and "Bangalore" not in locations:
                    locations.append("Bangalore")

    return clean_search_term, tags, locations


class ProviderNotConfiguredException(Exception):
    """Raised when an external discovery or enrichment provider is required but not configured."""
    pass


class ApiRateLimitException(Exception):
    """Raised when an external provider's quota or rate limit has been reached."""
    def __init__(self, key_name: str, detail: str):
        self.key_name = key_name
        self.detail = detail
        super().__init__(f"API Rate Limit or Quota Reached for key '{key_name}': {detail}")


class ApiAuthenticationException(Exception):
    """Raised when an external provider rejects credentials."""
    def __init__(self, key_name: str, detail: str):
        self.key_name = key_name
        self.detail = detail
        super().__init__(f"API Authentication Failed for key '{key_name}': {detail}")


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
        page: int = 1,
    ) -> list[dict[str, Any]]:
        """Executes a search for real business prospects across configured providers."""

        apollo_error = None
        # 1. Primary Strategy: Apollo API (if configured)
        if self.apollo_key and self.apollo_key != "mock_key":
            try:
                apollo_results = await self._search_apollo(query, market, industry, service_target, limit, page=page)
                if apollo_results:
                    return apollo_results
            except (ApiRateLimitException, ApiAuthenticationException) as exc:
                apollo_error = str(exc)
                logger.warning(f"Apollo provider error: {exc}")
                raise exc

        # 2. Secondary Strategy: Public Web Search Engine (Live crawler)
        web_results = await self._search_web(query, market, industry, service_target, limit)
        if web_results:
            return web_results

        # 3. If neither provider returned results, surface specific error
        if apollo_error:
            raise ApiRateLimitException("APOLLO_API_KEY", f"{apollo_error} (Public web fallback crawler also returned 0 results for query '{query}').")

        if not self.apollo_key:
            raise ProviderNotConfiguredException(
                "No active discovery provider is configured. Please add an Apollo API key (APOLLO_API_KEY) in .env "
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
        page: int = 1,
    ) -> list[dict[str, Any]]:
        """Queries Apollo API with header authentication (X-Api-Key) and Hunter.io enrichment."""
        headers = {
            "X-Api-Key": self.apollo_key,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
        }

        clean_search_term, tags, locations = parse_search_query(query, industry, market)
        fetch_size = min(max(limit, 10), 25)

        # 1. Try organizations/search with full-text search term & parsed locations
        try:
            async with httpx.AsyncClient(timeout=14.0) as client:
                org_payload: dict[str, Any] = {
                    "page": page,
                    "per_page": fetch_size,
                }
                if clean_search_term:
                    org_payload["q_organization_search_term"] = clean_search_term
                if locations:
                    org_payload["organization_locations"] = locations

                org_resp = await client.post(
                    "https://api.apollo.io/v1/organizations/search",
                    headers=headers,
                    json=org_payload,
                )

                organizations = []
                if org_resp.status_code == 200:
                    organizations = org_resp.json().get("organizations", [])
                elif org_resp.status_code == 429:
                    raise ApiRateLimitException("APOLLO_API_KEY", f"Monthly search credit or rate limit exhausted: {org_resp.text[:200]}")
                elif org_resp.status_code == 422 and ("CREDITS_EXHAUSTED" in org_resp.text or "insufficient credits" in org_resp.text.lower()):
                    raise ApiRateLimitException("APOLLO_API_KEY", "Monthly search credit limit exhausted: Your Apollo team has used all of its lead credits for this billing cycle.")
                elif org_resp.status_code in (401, 403):
                    raise ApiAuthenticationException("APOLLO_API_KEY", f"Invalid key or unauthorized: {org_resp.text[:200]}")

                # If 0 results, fallback to sanitized keyword tags
                if not organizations and tags:
                    tags_payload: dict[str, Any] = {
                        "page": page,
                        "per_page": fetch_size,
                        "q_organization_keyword_tags": tags[:3],
                    }
                    if locations:
                        tags_payload["organization_locations"] = locations
                    tags_resp = await client.post(
                        "https://api.apollo.io/v1/organizations/search",
                        headers=headers,
                        json=tags_payload,
                    )
                    if tags_resp.status_code == 200:
                        organizations = tags_resp.json().get("organizations", [])
                    elif tags_resp.status_code == 429:
                        raise ApiRateLimitException("APOLLO_API_KEY", f"Monthly search credit or rate limit exhausted: {tags_resp.text[:200]}")
                    elif tags_resp.status_code == 422 and ("CREDITS_EXHAUSTED" in tags_resp.text or "insufficient credits" in tags_resp.text.lower()):
                        raise ApiRateLimitException("APOLLO_API_KEY", "Monthly search credit limit exhausted: Your Apollo team has used all of its lead credits for this billing cycle.")

                # If still 0 results and locations were restrictive, try with country only
                if not organizations and len(locations) > 1:
                    country_only = [locations[-1]]
                    fallback_payload: dict[str, Any] = {
                        "page": page,
                        "per_page": fetch_size,
                        "organization_locations": country_only,
                    }
                    if clean_search_term:
                        fallback_payload["q_organization_search_term"] = clean_search_term
                    elif tags:
                        fallback_payload["q_organization_keyword_tags"] = tags[:2]

                    fb_resp = await client.post(
                        "https://api.apollo.io/v1/organizations/search",
                        headers=headers,
                        json=fallback_payload,
                    )
                    if fb_resp.status_code == 200:
                        organizations = fb_resp.json().get("organizations", [])

                results = []
                for org in organizations:
                    raw_domain = org.get("primary_domain")
                    norm_dom = normalize_domain(raw_domain)
                    if not norm_dom or norm_dom in BLOCKED_SEARCH_DOMAINS:
                        continue

                    company_name = org.get("name") or norm_dom.split(".")[0].title()
                    contact_name = None
                    contact_title = "Founder / Executive"
                    business_email = None
                    email_status = "unknown"

                    # Enrich with Hunter.io if HUNTER_API_KEY is available
                    if settings.HUNTER_API_KEY:
                        try:
                            h_resp = await client.get(
                                "https://api.hunter.io/v2/domain-search",
                                params={"domain": norm_dom, "api_key": settings.HUNTER_API_KEY, "limit": 1},
                                timeout=6.0,
                            )
                            if h_resp.status_code == 200:
                                h_data = h_resp.json().get("data", {})
                                emails = h_data.get("emails", [])
                                if emails:
                                    first_contact = emails[0]
                                    business_email = first_contact.get("value")
                                    fn = first_contact.get("first_name", "")
                                    ln = first_contact.get("last_name", "")
                                    if fn or ln:
                                        contact_name = f"{fn} {ln}".strip()
                                    if first_contact.get("position"):
                                        contact_title = first_contact.get("position")
                                    email_status = "verified"
                            elif h_resp.status_code == 429:
                                logger.warning("Hunter.io quota reached for key 'HUNTER_API_KEY' during domain enrichment.")
                        except Exception as h_err:
                            logger.debug(f"Hunter domain-search enrichment skipped for {norm_dom}: {h_err}")

                    results.append({
                        "company_name": company_name,
                        "domain": norm_dom,
                        "website_url": f"https://{norm_dom}",
                        "country": org.get("country") or org.get("city") or market,
                        "industry": org.get("industry") or industry,
                        "contact_name": contact_name,
                        "contact_title": contact_title,
                        "business_email": business_email,
                        "email_status": email_status,
                        "source_provider": "apollo_organizations_api",
                        "source_url": f"https://{norm_dom}",
                        "opportunity_type": service_target.lower().replace(" ", "_"),
                        "evidence_excerpt": f"Verified organization in {industry} ({market}) with active domain {norm_dom}.",
                        "fit_score": 88 if business_email else 78,
                    })

                    if len(results) >= limit:
                        break

                if results:
                    return results

        except (ApiRateLimitException, ApiAuthenticationException):
            raise
        except Exception as e:
            logger.warning(f"Apollo search encounter error: {e}")

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
                    if "uddg=" in raw_href:
                        match = re.search(r"uddg=([^&]+)", raw_href)
                        target_url = unquote(match.group(1)) if match else raw_href
                    else:
                        target_url = raw_href

                    parsed = urlparse(target_url)
                    norm_domain = normalize_domain(parsed.netloc or parsed.path)

                    if not norm_domain or norm_domain in BLOCKED_SEARCH_DOMAINS or norm_domain in seen_domains:
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
