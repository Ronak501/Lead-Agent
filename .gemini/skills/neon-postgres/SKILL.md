---
name: neon-postgres
description: Manage, query, branch, and optimize Neon Serverless PostgreSQL databases. Covers connection pooling, migrations, schema inspection, and serverless best practices.
---

# Neon Serverless PostgreSQL Skill

This skill guides the use of Neon Serverless Postgres in applications, specifically with Python/SQLAlchemy/psycopg and Node.js/Next.js.

## Architecture Guidelines

1. **Connection Pooling**:
   - Always use the pooled connection string (`ep-xyz-pooler.region.neon.tech`) for web applications, APIs (FastAPI), and serverless environments.
   - For Alembic or long-running migrations, use `DATABASE_URL_UNPOOLED` (`ep-xyz.region.neon.tech`).

2. **SQLAlchemy & Psycopg Configuration**:
   - Driver: Use `postgresql+psycopg://` with `psycopg` (v3).
   - Set `pool_pre_ping=True` to handle serverless cold-start connection checks.
   - Set `pool_recycle=300` to prevent stale connection timeouts across PgBouncer.

3. **Branching**:
   - Production branch: `production`
   - Ephemeral preview/dev branches can be created with `neon checkout <branch-name> --create`.

4. **Environment Variables**:
   - `DATABASE_URL`: Primary pooled PostgreSQL connection URI.
   - `DATABASE_URL_UNPOOLED`: Direct compute connection URI.
   - `NEON_BRANCH`: Active branch name.
