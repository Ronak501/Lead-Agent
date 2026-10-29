# LeadPilot AI — Production-Ready AI Cold Email Lead Generation SaaS

> **Evidence-Grounded B2B Outreach Engine**: Discovers high-intent business prospects across India and global markets, analyzes live website performance and tech stack gaps, verifies decision-maker deliverability, generates factual grounded drafts, and enforces mandatory human approval prior to dispatch.

---

## 1. System Architecture & 8-Phase Foundation

LeadPilot AI is built as a production-grade decoupled monorepo:

### Part 1: Relational Persistence & Multi-Tenant Isolation
- **15 PostgreSQL Models**: `users`, `workspaces`, `workspace_members`, `campaigns`, `companies`, `contacts`, `leads`, `source_evidence`, `website_audits`, `email_drafts`, `email_approvals`, `email_events`, `suppressions`, `integration_connections`, `audit_logs`.
- **Deduplication & Normalization**: Companies deduplicated by normalized domain (`normalize_domain`); contacts deduplicated by normalized email (`normalize_email`).
- **Alembic Versioning**: Versioned migration scripts in `apps/api/migrations/versions/`.
- **Graceful Fallback**: Automatically initializes SQLite (`leadpilot.db`) on zero-config local runs, with instant switch to PostgreSQL via `DATABASE_URL`.

### Part 2: Pluggable Discovery & Contact Enrichment
- **Apollo API Adapter**: Queries organizations and verified decision-maker contacts.
- **Live Search Adapter**: Live crawler discovering active business domains matching market & industry queries.
- **Zero Hallucination Policy**: If providers are unconfigured, actionable integration messages are surfaced instead of returning fabricated companies or guessed emails.

### Part 3: Live Website Opportunity Analyzer & SSRF Protection
- **SSRF Defense**: Strict blocking of localhost, `127.0.0.1`, `0.0.0.0`, cloud metadata endpoints (`169.254.169.254`), and unsafe redirects.
- **Diagnostics**: Real-time HTTP crawler checking response latency, viewport tag presence, tech stack fingerprints (WordPress, Wix, React/Next.js), and CTA presence.
- **Google PageSpeed Insights**: Optional integration for mobile Core Web Vitals scoring.
- **Separation of Concerns**: Factual observations and inferred opportunities are recorded separately.

### Part 4: Evidence-Grounded AI Email Drafting
- **Groq LPU Acceleration (Primary)**: Uses Groq's high-speed inference engine (`llama-3.3-70b-versatile` or `llama-3.1-8b-instant`) with strict JSON schema response mode.
- **Gemini API Integration (Secondary / Fallback)**: Supported for multi-model flexibility.
- **Strict Grounding Rule**: Opening personalization lines MUST quote verifiable source observations.
- **Tamper-Proof Hashing**: SHA-256 content fingerprinting (`compute_content_hash`). Any edit to an approved draft revokes sign-off and resets status to `pending_review`.

### Part 5: Mandatory Human Approval & 5-Gate Sending Filter
No email is ever sent programmatically or in bulk without explicit individual review:
1. **Gate 1**: Explicit human sign-off (`approved_at` timestamp and reviewer identifier).
2. **Gate 2**: Exact SHA-256 content verification matching approval snapshot.
3. **Gate 3**: Suppression list check (blocks unsubscribes, bounces, complaints, and domain wildcards).
4. **Gate 4**: Deliverability status verification (restricted to `valid` or `verified`).
5. **Gate 5**: Master sending killswitch (`EMAIL_SENDING_ENABLED`) and OAuth account authorization.

### Part 6: Next.js 15 App Router Dashboard UI (All 9 Pages)
1. **Dashboard (Overview)**: Full funnel visualization, KPIs, quality checklist, and demo data reloader.
2. **Campaign Builder**: Dedicated campaign creation and parameter tuning with target markets, industries, company sizes, and services.
3. **Lead Discovery**: Filterable prospect table with decision makers, verification badges, fit score, and quick actions.
4. **Lead Details**: Deep diagnostic view separating observed technical issues from marketing opportunities, stored evidence cards, and contact provenance.
5. **Email Drafts**: Interactive draft studio with side-by-side evidence citations and live Desktop/Mobile preview toggle.
6. **Approval Queue**: Dedicated individual sign-off station displaying recipient, sender identity, subject, and body. (Batch send without review is prohibited).
7. **Inbox & Analytics**: Delivery event breakdown (sent, delivered, opened, replied, bounced, opted-out) and CSV export.
8. **Integrations**: Provider connection hub for Gemini, Apollo, Hunter, Gmail OAuth, and PageSpeed.
9. **Settings**: Workspace settings, usage quotas, team roles, and suppression list management.

---

## 2. Quickstart Guide (Run Locally on Windows)

### Prerequisites
- Python 3.11+
- Node.js 20+ and npm
### Option A: Run Everything with a Single Docker Command (Recommended)

To start the entire production-grade stack (Frontend + Backend + PostgreSQL + Redis) in one go:

```powershell
cd d:\WEB\Lead-Agent
docker compose up --build
```

- **Next.js Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

*(Database migrations and seed data run automatically inside the containers).*

---

### Option B: Run Services Manually (Without Docker)

### Step 1: Start Backend (Terminal 1)

```powershell
cd d:\WEB\Lead-Agent\apps\api

# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) Run Alembic migrations against PostgreSQL
alembic upgrade head

# 4. Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

- API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

### Step 2: Start Frontend Dashboard (Terminal 2)

```powershell
cd d:\WEB\Lead-Agent\apps\web

# 1. Install dependencies
npm install

# 2. Start Next.js dev server
npm run dev
```

- Web Dashboard: [http://localhost:3000](http://localhost:3000)

---

### Step 3: Run Infrastructure with Docker Compose (Optional)

To run PostgreSQL 16 and Redis 7 in containers:

```powershell
cd d:\WEB\Lead-Agent\infra
docker compose up -d
```

---

## 3. Environment Variables Reference

Configure variables in `apps/api/.env`:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URI (falls back to SQLite `leadpilot.db` if unreachable) | `sqlite:///./leadpilot.db` |
| `REDIS_URL` | Redis connection URL for background jobs | `redis://localhost:6379/0` |
| `GROQ_API_KEY` | Groq API key for ultra-fast LPU email drafting | Empty (falls back to Gemini/template) |
| `GROQ_MODEL` | Groq model selection (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) | `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` | Google Gemini API key (secondary fallback) | Empty |
| `APOLLO_API_KEY` | Apollo.io API key for live B2B discovery and contact enrichment | Empty (uses live web search crawler) |
| `HUNTER_API_KEY` | Hunter.io API key for authoritative email verification | Empty (uses DoH DNS MX validation) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for Gmail dispatch | Empty |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret for Gmail dispatch | Empty |
| `EMAIL_SENDING_ENABLED` | Master outreach killswitch (`false` = simulated safe sandbox) | `false` |
| `DEFAULT_WORKSPACE_ID` | Default workspace partition ID for multi-tenant isolation | `ws_default_01` |

---

## 4. Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check & safety configuration |
| `GET` | `/api/campaigns` | List workspace campaigns with lead counts |
| `POST` | `/api/campaigns` | Create new targeting campaign |
| `GET` | `/api/leads` | Filter leads by status, fit score, or campaign |
| `POST` | `/api/leads/discover` | Discover real prospects via Apollo or search crawler |
| `POST` | `/api/leads/{id}/audit` | Run live website crawl & opportunity detection |
| `GET` | `/api/drafts` | List generated email drafts |
| `POST` | `/api/drafts/generate` | Generate grounded cold email draft with Gemini |
| `PUT` | `/api/drafts/{id}` | Edit draft (automatically revokes previous approval) |
| `POST` | `/api/drafts/{id}/approve` | Individually sign-off & lock draft with SHA-256 hash |
| `POST` | `/api/drafts/{id}/send` | Validate 5 safety gates & dispatch email |
| `POST` | `/api/webhooks/email-events` | Ingest delivery webhooks (auto-suppresses on bounce/opt-out) |
| `GET` | `/api/oauth/gmail/authorize` | Get Google OAuth consent URL |
| `POST` | `/api/oauth/gmail/callback` | Exchange OAuth code and activate provider |
| `GET` | `/api/suppressions` | List blocked emails and domains |
| `POST` | `/api/suppressions` | Add address or domain to suppression blocklist |
| `DELETE` | `/api/suppressions/{id}` | Remove address from suppression list |
| `GET` | `/api/analytics` | Delivery metrics, funnel stats, and conversion rate |
| `GET` | `/api/leads/export/csv` | Download CSV of discovered leads and verification data |
| `POST` | `/api/seed` | Reset and reload verified demo leads and audits |

---

## 5. Running Automated Tests

To run the comprehensive security and safety test suite:

```powershell
cd d:\WEB\Lead-Agent\apps\api
pytest -v
```

Tests verify:
- Strict SSRF blocking against private subnets and metadata URLs
- Approval bypass prevention (unapproved drafts are blocked from dispatch)
- Tamper-proof SHA-256 draft hash verification
- Suppression list enforcement (suppressed recipients cannot be emailed)
- Unverified email address blocking
- Multi-tenant workspace data isolation
- Domain and email normalization routines
- Email verification provider syntax & disposable domain rejection
- Discovery provider unconfigured error handling
#   L e a d - A g e n t  
 