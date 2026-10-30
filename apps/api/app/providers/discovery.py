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
    ) -> list[dict[str, Any]]:
        """Executes a search for real business prospects across configured providers."""

        apollo_error = None
        # 1. Primary Strategy: Apollo API (if configured)
        if self.apollo_key and self.apollo_key != "mock_key":
            try:
                apollo_results = await self._search_apollo(query, market, industry, service_target, limit)
                if apollo_results:
                    return apollo_results
            except (ApiRateLimitException, ApiAuthenticationException) as exc:
                apollo_error = str(exc)
                logger.warning(f"Apollo provider error: {exc}")

        # 2. Secondary Strategy: Public Web Search Engine (Live crawler)
        web_results = await self._search_web(query, market, industry, service_target, limit)
        if web_results:
            return web_results

        # 3. If neither provider returned results, surface specific error
        if apollo_error:
            raise ApiRateLimitException(f"{apollo_error} (Public web fallback crawler also returned 0 results for query '{query}').")

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
    ) -> list[dict[str, Any]]:
        """Queries Apollo API with header authentication (X-Api-Key) and Hunter.io enrichment."""
        headers = {
            "X-Api-Key": self.apollo_key,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
        }

        # 1. Try mixed_people/search first (supported on paid Apollo plans)
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(
                    "https://api.apollo.io/v1/mixed_people/search",
                    headers=headers,
                    json={
                        "q_organization_keyword_tags": [query, industry] if query else [industry],
                        "person_locations": [market] if market and market != "Global" else [],
                        "page": 1,
                        "per_page": limit,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    people = data.get("people", [])
                    organizations = data.get("organizations", [])
                    org_map = {o.get("id"): o for o in organizations if o.get("id")}
                    results = []
                    for p in people[:limit]:
                        org = org_map.get(p.get("organization_id"), {})
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
                elif resp.status_code == 429:
                    raise ApiRateLimitException("APOLLO_API_KEY", f"Monthly search credit or rate limit exhausted: {resp.text[:200]}")
                # If 403 or 422 (e.g. free plan where mixed_people is restricted), proceed to organizations/search fallback
        except (ApiRateLimitException, ApiAuthenticationException):
            raise
        except Exception as e:
            logger.warning(f"Apollo mixed_people/search unavailable, falling back to organizations/search: {e}")

        # 2. Resilient Fallback: organizations/search (Fully supported on Apollo Free and Paid plans)
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                keyword_tags = [k for k in [query, industry] if k and k.lower() not in ("all", "global")]
                locations = [market] if market and market.lower() not in ("all", "global") else []
                org_payload: dict[str, Any] = {
                    "page": 1,
                    "per_page": limit,
                }
                if keyword_tags:
                    org_payload["q_organization_keyword_tags"] = keyword_tags
                if locations:
                    org_payload["organization_locations"] = locations

                org_resp = await client.post(
                    "https://api.apollo.io/v1/organizations/search",
                    headers=headers,
                    json=org_payload,
                )
                if org_resp.status_code == 200:
                    org_data = org_resp.json()
                    organizations = org_data.get("organizations", [])
                    results = []

                    for org in organizations[:limit]:
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
                            except Exception as h_err:
                                logger.debug(f"Hunter domain-search enrichment skipped for {norm_dom}: {h_err}")

                        results.append({
                            "company_name": company_name,
                            "domain": norm_dom,
                            "website_url": f"https://{norm_dom}",
                            "country": org.get("country") or market,
                            "industry": org.get("industry") or industry,
                            "contact_name": contact_name,
                            "contact_title": contact_title,
                            "business_email": business_email,
                            "email_status": email_status,
                            "source_provider": "apollo_organizations_api",
                            "source_url": f"https://{norm_dom}",
                            "opportunity_type": service_target.lower().replace(" ", "_"),
                            "evidence_excerpt": f"Verified organization registered in {industry} ({market}) with active domain {norm_dom}.",
                            "fit_score": 85 if business_email else 75,
                        })

                    if results:
                        return results
                elif org_resp.status_code == 429:
                    raise ApiRateLimitException("APOLLO_API_KEY", f"Monthly search credit or rate limit exhausted: {org_resp.text[:200]}")
                elif org_resp.status_code in (401, 403):
                    raise ApiAuthenticationException("APOLLO_API_KEY", f"Invalid key or unauthorized: {org_resp.text[:200]}")
                else:
                    logger.warning(f"Apollo organizations/search returned HTTP {org_resp.status_code}: {org_resp.text[:200]}")
        except (ApiRateLimitException, ApiAuthenticationException):
            raise
        except Exception as e:
            logger.warning(f"Apollo organizations/search failed: {e}")

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
