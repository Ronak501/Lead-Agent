# LeadPilot AI Platform Improvement Plan & Implementation Guide

This document specifies the technical audit, architectural improvements, and code-level fixes required across the LeadPilot AI platform (`apps/api` and `apps/web`), ensuring seamless synchronization with the live Neon Cloud Serverless PostgreSQL database, resilient Groq LPU inference, fault-tolerant lead discovery, and an enterprise-grade UI experience.

---

## 1. Executive Summary & Improvement Roadmap

| Item | Category | Issue / Inefficiency | Solution | Status |
|---|---|---|---|---|
| **1.1** | **AI Inference & Drafting** | `openai/gpt-oss-120b` and `llama-3.1-8b-instant` in `.env` and `ai_drafter.py` trigger HTTP 400/404 errors on Groq. | Standardize on production-tested `llama-3.3-70b-versatile` and clean Groq model candidate cascades. | **Implemented** |
| **1.2** | **1-Click Domain Profiling** | `auto_profile_domain` endpoint in `routes.py` called invalid candidate models causing 502 Bad Gateway. | Upgrade `routes.py` reverse profiler to `llama-3.3-70b-versatile` with resilient fallbacks. | **Implemented** |
| **1.3** | **Live Neon Cloud DB Visibility** | Web UI showed generic "Online" indicator without confirming the live Neon Cloud DB connection. | Expose database engine in `/health` API and render a live "Neon Serverless DB (AWS us-east-2)" badge in the UI. | **Implemented** |
| **1.4** | **Neon Connection Pooling Resilience** | Serverless PgBouncer pooling needed explicit pre-ping protection on cold-start recovery. | Refine SQLAlchemy engine configuration in `database.py` with `pool_pre_ping=True` and clean handling. | **Implemented** |
| **1.5** | **Discovery Web Crawler Robustness** | DuckDuckGo HTML crawler could fail on non-standard redirect paths or empty responses. | Add defensive URI parsing, unquoting, and safe error trapping before cascading to Verified B2B Startup Registry. | **Implemented** |
| **1.6** | **Autonomous Worker Cycle Safety** | A transient exception during a single lead dispatch could potentially stall the autonomous loop. | Add isolated per-lead exception containment and clean session rollback to guarantee uninterrupted 15-minute cycles. | **Implemented** |

---

## 2. Detailed Technical Improvements

### 2.1 Groq LPU Model Standardization
- **Problem**: Groq API returns HTTP 400 (`Failed to validate JSON`) or HTTP 404 when requested with deprecated or experimental model identifiers (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.1-8b-instant`).
- **Target Files**:
  - `apps/api/app/providers/ai_drafter.py`
  - `apps/api/app/routes.py` (under `/api/campaigns/auto-profile`)
  - `apps/api/.env` and `.env` (root)
- **Change**: Replace default and fallback candidate arrays with Groq's premier models:
  ```python
  candidate_models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama3-70b-8192",
      "llama3-8b-8192",
      "mixtral-8x7b-32768"
  ]
  ```

### 2.2 Live Neon Cloud DB Indicator in Web Dashboard
- **Problem**: Users need confirmation that their local dashboard is working with live production data on Neon Cloud PostgreSQL rather than an isolated SQLite or local container DB.
- **Target Files**:
  - `apps/api/app/schemas.py` & `apps/api/app/main.py`: Add `database_engine` to `ApiStatus` schema and `/health` route.
  - `apps/web/context/AppContext.tsx`: Store `databaseEngine` state upon health check.
  - `apps/web/components/overview/OverviewView.tsx`: Display a high-visibility badge ("Neon Serverless DB (Live AWS us-east-2)") alongside the Autonomous Prospecting banner.

### 2.3 Discovery Waterfall & Lead De-duplication
- **Problem**: Cold emails should exclusively target high-intent startups and SMEs in need of tech support, web/mobile development, and feature velocity—while strictly blocking enterprise tech giants (e.g. Google, Microsoft, Zoho, BrowserStack) and preventing repeat contacts.
- **Target Files**:
  - `apps/api/app/providers/discovery.py`: Safeguard DuckDuckGo crawler URL parsing, preserve `EXCLUDED_ENTERPRISE_DOMAINS` and `VERIFIED_B2B_REGISTRY`.
  - `apps/api/app/automation_service.py`: Maintain workspace-wide de-duplication rules in `is_target_already_contacted`.

### 2.4 Autonomous Worker Fault Tolerance
- **Problem**: Background automation tasks must operate 24/7 without being interrupted by a single provider timeout.
- **Target Files**:
  - `apps/api/app/main.py`: Ensure `periodic_automation_loop` handles exceptions gracefully and sleeps before retrying.
  - `apps/api/app/automation_service.py`: Wrap per-lead execution in isolated `try...except` blocks with database rollbacks.

---

## 3. Implementation Verification Checklist
- [x] `GROQ_MODEL=llama-3.3-70b-versatile` set in `apps/api/.env`, `.env`, and `config.py`
- [x] Candidate models updated in `apps/api/app/providers/ai_drafter.py`
- [x] Candidate models updated in `apps/api/app/routes.py` (`auto_profile_domain`)
- [x] `database_engine` exposed in `ApiStatus` and `/health` endpoint in `apps/api/app/main.py`
- [x] Neon Cloud live badge rendered in `OverviewView.tsx`
- [x] `apps/api/app/database.py` configured with clean serverless pooling
- [x] Safe exception handling and per-lead rollback in `automation_service.py`
- [x] Dynamic `PUBLIC_API_URL` tracking and one-click unsubscribe headers in `safe_outreach.py`

---

## 4. Next Strategic Recommendations & Production Roadmap

The following high-value enhancements represent the logical next steps to scale LeadPilot AI into an enterprise-grade outbound engine:

### 4.1 Autonomous Multi-Touch Follow-Up Cadence (Day 3 Bump & Day 7 Breakup)
- **Current State**: Initial cold pitches are dispatched automatically, but follow-ups currently require manual initiation from the UI. In B2B sales outreach, over 70% of positive replies occur on Step 2 or Step 3.
- **Recommended Solution**:
  - Add an automated sequence runner to `AutomationEngine.run_full_cycle`:
    - Checks sent leads where `draft.sent_at <= now - 3 days` with no reply and no suppression.
    - Automatically composes and dispatches Step 1 Follow-up ("Quick conversational bump on my note below..."), preserving the subject thread (`Re: ...`).
    - After 7 days of no reply, dispatches Step 2 Breakup note ("Assuming this isn't a priority right now...").

### 4.2 Pre-Send Deliverability & Spam Keyword Linter
- **Current State**: Groq LPU composes compelling copy, but drafts are not pre-screened against email service provider (ESP) spam trigger dictionaries.
- **Recommended Solution**:
  - Add a pre-send spam keyword scanner in `SafeEmailSender` flagging phrases such as `"100% free"`, `"guarantee"`, `"risk-free"`, or excessive capitalization.
  - Automatically sanitizes high-risk phrases before dispatch to maintain a 99%+ sender reputation score for `founder@ornitech.in`.

### 4.3 Campaign Auto-Pause on High Bounce Rate (Circuit Breaker)
- **Current State**: Single bounces are suppressed, but if a campaign targets outdated domains and exceeds a 5% bounce rate, the campaign continues running.
- **Recommended Solution**:
  - Implement an automated circuit breaker: if any campaign records > 5% bounce rate over 20+ sends, immediately auto-pause the campaign, log an alert, and notify `founder@ornitech.in`.

### 4.4 Automated Warmup Schedule Ramping
- **Current State**: Sending limit is currently capped statically at 50 or 100 emails per day.
- **Recommended Solution**:
  - Implement a warmup ramp: Week 1 (15 sends/day), Week 2 (30 sends/day), Week 3 (50 sends/day), Week 4+ (100 sends/day) to safely build sender domain reputation with Gmail and Outlook.


