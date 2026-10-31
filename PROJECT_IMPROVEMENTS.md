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
- [x] `GROQ_MODEL=llama-3.3-70b-versatile` set in `apps/api/.env` and `.env`
- [x] Candidate models updated in `apps/api/app/providers/ai_drafter.py`
- [x] Candidate models updated in `apps/api/app/routes.py` (`auto_profile_domain`)
- [x] `database_engine` exposed in `ApiStatus` and `/health` endpoint in `apps/api/app/main.py`
- [x] Neon Cloud live badge rendered in `OverviewView.tsx`
- [x] `apps/api/app/database.py` configured with clean serverless pooling
- [x] Safe exception handling in `automation_service.py`

