# LeadPilot AI 🚀
### Autonomous B2B Lead Discovery, Cold Outreach & Reply Notification Platform

> **Internal Enterprise Platform for Ornitech Solutions (`@ornitech.in`)**  
> Deployed on **Google Cloud Run** | Database on **Neon Serverless PostgreSQL**

---

## 📌 Overview

**LeadPilot AI** is an autonomous outbound sales and prospecting system built specifically for **Ornitech Solutions**. It discovers real business prospects, audits their live websites, generates highly personalized, evidence-grounded cold email pitches, automatically dispatches outreach sequences, and monitors inboxes for replies—sending instant high-priority alerts to `founder@ornitech.in`.

---

## 🏗️ Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │   Client Browser / Mobile Safari / Chrome    │
                  └──────────────────────┬───────────────────────┘
                                         │
                   (Access restricted to @ornitech.in users)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Google Cloud Run (asia-south1)                                                  │
│                                                                                 │
│  ┌─────────────────────────────────────┐   API Requests   ┌──────────────────┐  │
│  │  leadpilot-web (Next.js 15 UI)       │ ───────────────> │  leadpilot-api   │  │
│  │  - Ornitech Auth Gate               │                  │  (FastAPI)       │  │
│  │  - Campaign & Lead Management       │ <─────────────── │  - Autonomous    │  │
│  │  - Draft Review & Outbox Monitoring │    CORS Handled  │    Engine        │  │
│  └─────────────────────────────────────┘                  └────────┬─────────┘  │
└────────────────────────────────────────────────────────────────────┼────────────┘
                                                                     │
                         ┌───────────────────────────────────────────┼────────────────────────────────────────┐
                         │                                           │                                        │
                         ▼                                           ▼                                        ▼
      ┌─────────────────────────────────────┐     ┌───────────────────────────────────┐    ┌───────────────────────────────────┐
      │ Neon Serverless PostgreSQL          │     │ Cold Outreach Engine              │    │ IMAP Reply Listener               │
      │ Project: patient-sun-84571978       │     │ - Live SMTP / Gmail API           │    │ - Detects prospect replies        │
      │ Branch: production                  │     │ - Unique Message-ID tracking      │    │ - Halts automated follow-ups      │
      │ - 15 Relational Tables              │     │ - Rate-limited & personalized     │    │ - Sends instant email alert to    │
      │ - Connection Pooling via PgBouncer  │     │                                   │    │   founder@ornitech.in             │
      └─────────────────────────────────────┘     └───────────────────────────────────┘    └───────────────────────────────────┘
```

---

## ✨ Core Capabilities

### 1. 🔍 Automated Lead Discovery
* Discovers prospective companies based on target market, city, industry, and service criteria.
* Automatically verifies email deliverability via DNS MX records before queuing.
* Checks domain suppressions to avoid contacting unsubscribed or opted-out leads.
* Performs live HTTP/tech audits on prospects' websites.

### 2. ⚡ Automated Email Personalization & Dispatch
* Generates evidence-grounded pitches highlighting performance, tech stack, or UI gaps detected during website audits.
* Locks drafts with SHA-256 content hashes to guarantee tampering protection.
* Dispatches through authenticated SMTP/Gmail with custom `Message-ID` headers for thread tracking.

### 3. 🔔 Real-Time Reply Detection & Instant Alert
* Continuously checks incoming emails via IMAP/Webhooks for references to outbound campaign messages.
* When a lead replies:
  1. Status immediately updates to **`REPLIED`**.
  2. All pending follow-ups for that lead are halted.
  3. **Dispatches an instant email alert to `founder@ornitech.in`** containing prospect details, company website, and full reply text.

### 4. 🔒 Strict `@ornitech.in` Authentication Gate
* **Google Workspace Single Sign-On (GIS)**: Restricts Google Sign-In strictly to `hosted_domain: "ornitech.in"`.
* **Corporate Email Login**: Team members can sign in with their `@ornitech.in` address.
* Any user attempting to log in from `@gmail.com` or any external domain is rejected with `403 Forbidden`.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 15, React 19, Tailwind CSS, Lucide Icons
* **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0, Pydantic v2
* **Database**: Neon Serverless PostgreSQL (`psycopg` v3 driver with PgBouncer connection pooling)
* **Hosting**: Google Cloud Run (`asia-south1`)
* **CI/CD**: GitHub Actions automated pipeline

---

## 🚀 Live Cloud Run Endpoints

| Service | Cloud Run URL |
|---|---|
| **Web Dashboard** | [https://leadpilot-web-822012759095.asia-south1.run.app](https://leadpilot-web-822012759095.asia-south1.run.app) |
| **API Documentation** | [https://leadpilot-api-822012759095.asia-south1.run.app/docs](https://leadpilot-api-822012759095.asia-south1.run.app/docs) |
| **Health Check** | [https://leadpilot-api-822012759095.asia-south1.run.app/health](https://leadpilot-api-822012759095.asia-south1.run.app/health) |
| **Autonomous Status**| [https://leadpilot-api-822012759095.asia-south1.run.app/api/automation/status](https://leadpilot-api-822012759095.asia-south1.run.app/api/automation/status) |

---

## ⚙️ Environment Variables

### Backend (`apps/api/.env`)
```env
# Database (Neon Serverless PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:***@ep-curly-term-b5ci0so6-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Access Control
ALLOWED_OAUTH_DOMAIN=ornitech.in
JWT_SECRET=your-secure-jwt-secret-key

# Notification & Alerts
ADMIN_NOTIFICATION_EMAIL=founder@ornitech.in
SENDER_NAME="Ornitech Solutions"
SENDER_EMAIL=founder@ornitech.in

# Live Sending & Reply Polling
EMAIL_SENDING_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=founder@ornitech.in
SMTP_PASS=your-google-app-password
IMAP_SERVER=imap.gmail.com
IMAP_USER=founder@ornitech.in
IMAP_PASS=your-google-app-password

# Continuous Background Automation
AUTOPILOT_AUTO_RUN=true
AUTOPILOT_INTERVAL_MINUTES=15
```

---

## 💻 Local Development Quickstart

### 1. Prerequisites
- Node.js 20+
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip

### 2. Backend Setup
```bash
cd apps/api
uv venv .venv
source .venv/bin/activate  # On Windows: .\.venv\Scripts\activate
uv pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🤖 Installed Agent Skills

This repository includes custom agent skills in `.gemini/skills/`:
- **`neon-postgres`**: Guidelines for Neon Serverless PostgreSQL, branching, connection pooling, and migrations.
- **`leadpilot-outreach`**: Autonomous lead discovery, outreach cadence, deliverability verification, and reply alerting rules.

---

## 📄 License

Proprietary — Internal software for **Ornitech Solutions** (`ornitech.in`). All rights reserved.
