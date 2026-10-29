---
name: leadpilot-outreach
description: Autonomous B2B Lead Prospecting, Email Outreach, Reply Detection, and Notification Engine for Ornitech Solutions.
---

# LeadPilot Autonomous Outreach Skill

This skill governs the autonomous cold email prospecting, safety checks, deliverability verification, and reply alerting mechanisms for Ornitech Solutions.

## Core Pipelines

### 1. Lead Discovery Engine
- **Source Providers**: Apollo, Hunter, public search crawlers.
- **Verification Gates**:
  - Validates domain syntax and MX DNS records before queuing.
  - Checks domain against workspace suppression lists.
  - Audits target website for tech stack and performance gaps.

### 2. Autonomous Outreach Dispatcher
- **Draft Generation**:
  - Grounds pitches in public audit evidence.
  - Computes SHA-256 fingerprint (`approval_hash`) to ensure content integrity.
- **Dispatch**:
  - Sends via authorized SMTP/Gmail integration with unique `Message-ID`.
  - Rate-limited and spaced to protect sender reputation.

### 3. Real-Time Reply Listener & Alerting
- **IMAP / Webhook Polling**:
  - Inspects `In-Reply-To` and `References` headers matching outreach messages.
  - When prospect replies:
    1. Sets status immediately to `REPLIED`.
    2. Halts any future automated follow-up sequence.
    3. Triggers immediate alert email to `founder@ornitech.in`.

### 4. Access Control
- Strictly enforces `@ornitech.in` Google Workspace authentication.
- Any foreign domain is rejected with HTTP 403 Forbidden.

