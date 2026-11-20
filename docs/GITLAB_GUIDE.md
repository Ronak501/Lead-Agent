# GitLab Integration & CI/CD Architecture Guide

This guide explains how **GitLab** integrates with the **LeadPilot AI** platform, how the automated CI/CD pipeline works, and how to link your local workspace to GitLab alongside GitHub.

---

## 1. How GitLab Works in This Project

When you push code to GitLab or open a Merge Request, the GitLab runner reads [`.gitlab-ci.yml`](../.gitlab-ci.yml) and executes a multi-stage pipeline:

```
 Git Push / Merge Request
            │
            ▼
┌──────────────────────────┐
│ Stage 1: Lint            │  Checks syntax and static code quality
│  - api:lint              │  Runs Python Flake8 on apps/api
│  - web:lint              │  Runs ESLint on apps/web Next.js code
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Stage 2: Test            │  Guarantees security and business rules
│  - api:test              │  Executes 20 pytest suites in test_safety_and_rules.py
│                          │  Validates RFC compliance, suppression, auth & CSV locks
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Stage 3: Build           │  Packages the production assets
│  - web:build_check       │  Compiles Next.js frontend to verify zero build errors
│  - docker:build_images   │  Builds Docker images for API & Web
│                          │  Pushes to GitLab Container Registry ($CI_REGISTRY_IMAGE)
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Stage 4: Deploy (Manual) │  1-Click deployment gate for production
│  - deploy:cloud_run      │  Deploys verified container images to Google Cloud Run
└──────────────────────────┘
```

---

## 2. Key Advantages of GitLab for LeadPilot

1. **Integrated Container Registry**: GitLab automatically provides a secure private Docker registry (`registry.gitlab.com/<username>/lead-agent/api` and `/web`) at zero cost.
2. **Merge Request Approvals**: Prevents untested changes to sensitive auth routes, SMTP senders, or database models from reaching the `main` branch.
3. **Environment Secret Masking**: Secrets like `JWT_SECRET`, `NEON_DATABASE_URL`, and `GCP_SERVICE_KEY` are injected dynamically into CI/CD runners without hardcoding them in source control.
4. **Independent Runners**: Tests run in clean, isolated Docker environments (`python:3.11-slim` and `node:20-alpine`), matching production behavior.

---

## 3. How to Connect This Project to GitLab

You can push to GitLab while keeping your existing GitHub repository synchronized:

### Step 1: Create a Project on GitLab
1. Sign in to [GitLab.com](https://gitlab.com).
2. Click **New project / repository** -> **Create blank project**.
3. Name it `Lead-Agent` (or `leadpilot`).
4. Uncheck *"Initialize repository with a README"* (since your project already exists).

### Step 2: Add GitLab as a Git Remote
Open your terminal in `d:/WEB/Lead-Agent` and run:

```bash
# Add GitLab remote (replace <username> with your GitLab handle)
git remote add gitlab git@gitlab.com:<username>/Lead-Agent.git

# Verify remotes
git remote -v
```

### Step 3: Push Your Code & CI Configuration
```bash
git add .gitlab-ci.yml docs/GITLAB_GUIDE.md
git commit -m "ci: add GitLab CI/CD pipeline and integration guide"
git push -u gitlab main
```

---

## 4. Configuring GitLab CI/CD Variables

To enable automated testing and deployment, add your environment secrets:

1. In GitLab, navigate to **Settings** -> **CI/CD** -> **Variables**.
2. Click **Add variable** and set the following:

| Variable Name | Type | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Variable (Masked) | Your live Neon PostgreSQL connection string. |
| `JWT_SECRET` | Variable (Masked) | 64-hex cryptographic secret for session tokens. |
| `WEBHOOK_SECRET` | Variable (Masked) | Secret key for verifying email webhook payloads. |
| `GCP_PROJECT_ID` | Variable | Your Google Cloud project ID (e.g. `ornitech-leadpilot`). |
| `GCP_SERVICE_KEY` | File / Variable | Service account JSON key with Cloud Run Admin permissions. |

---

## 5. Pushing to Both GitHub and GitLab Simultaneously

To push to both GitHub and GitLab with a single `git push` command:

```bash
git remote set-url --add --push origin https://github.com/Ronak501/Lead-Agent.git
git remote set-url --add --push origin git@gitlab.com:<username>/Lead-Agent.git
```

Now, running `git push origin main` will update both repositories and trigger both GitHub and GitLab pipelines simultaneously.
