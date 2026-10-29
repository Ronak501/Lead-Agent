"""Initial PostgreSQL schema with workspace isolation, normalization, and audit trails

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-10-27 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=True, server_default=""),
        sa.Column("hashed_password", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. workspaces
    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("owner_email", sa.String(length=255), nullable=False),
        sa.Column("plan", sa.String(length=50), server_default="growth", nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # 3. workspace_members
    op.create_table(
        "workspace_members",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("workspace_id", sa.String(length=64), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=50), server_default="member", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_workspace_members_workspace_id", "workspace_members", ["workspace_id"])
    op.create_index("ix_workspace_members_user_id", "workspace_members", ["user_id"])

    # 4. campaigns
    op.create_table(
        "campaigns",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("workspace_id", sa.String(length=64), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("target_country", sa.String(length=100), server_default="India"),
        sa.Column("target_city", sa.String(length=100), server_default="Bangalore"),
        sa.Column("company_type", sa.String(length=100), server_default="B2B SaaS"),
        sa.Column("max_lead_count", sa.Integer(), server_default="50"),
        sa.Column("qualification_criteria", sa.Text(), nullable=True),
        sa.Column("target_markets_json", sa.Text(), nullable=True),
        sa.Column("industries_json", sa.Text(), nullable=True),
        sa.Column("locations_json", sa.Text(), nullable=True),
        sa.Column("company_sizes_json", sa.Text(), nullable=True),
        sa.Column("services_json", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_campaigns_workspace_id", "campaigns", ["workspace_id"])

    # 5. companies
    op.create_table(
        "companies",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("workspace_id", sa.String(length=64), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("domain", sa.String(length=255), nullable=True),
        sa.Column("website_url", sa.String(length=500), nullable=True),
        sa.Column("country", sa.String(length=100), server_default="India"),
        sa.Column("industry", sa.String(length=120), server_default="Technology"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_companies_workspace_id", "companies", ["workspace_id"])
    op.create_index("ix_companies_domain", "companies", ["domain"])

    # 6. contacts
    op.create_table(
        "contacts",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("company_id", sa.String(length=64), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("title", sa.String(length=150), server_default="Founder / Decision Maker"),
        sa.Column("business_email", sa.String(length=255), nullable=True),
        sa.Column("email_status", sa.String(length=50), server_default="unknown"),
        sa.Column("profile_url", sa.String(length=500), nullable=True),
        sa.Column("source_provider", sa.String(length=100), server_default="manual_import"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_contacts_company_id", "contacts", ["company_id"])
    op.create_index("ix_contacts_business_email", "contacts", ["business_email"])

    # 7. leads
    op.create_table(
        "leads",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("campaign_id", sa.String(length=64), sa.ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True),
        sa.Column("company_id", sa.String(length=64), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contact_id", sa.String(length=64), sa.ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("fit_score", sa.Integer(), server_default="75"),
        sa.Column("opportunity_type", sa.String(length=100), server_default="website_redesign"),
        sa.Column("status", sa.String(length=50), server_default="needs_review"),
        sa.Column("last_reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_leads_campaign_id", "leads", ["campaign_id"])
    op.create_index("ix_leads_company_id", "leads", ["company_id"])
    op.create_index("ix_leads_contact_id", "leads", ["contact_id"])

    # 8. source_evidence
    op.create_table(
        "source_evidence",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("lead_id", sa.String(length=64), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", sa.String(length=64), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source_url", sa.String(length=500), nullable=False),
        sa.Column("evidence_type", sa.String(length=100), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
        sa.Column("confidence", sa.Float(), server_default="0.85"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_source_evidence_lead_id", "source_evidence", ["lead_id"])

    # 9. website_audits
    op.create_table(
        "website_audits",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("company_id", sa.String(length=64), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("checked_at", sa.DateTime(), nullable=False),
        sa.Column("status_code", sa.Integer(), server_default="200"),
        sa.Column("title", sa.String(length=300), nullable=True),
        sa.Column("meta_description", sa.Text(), nullable=True),
        sa.Column("tech_stack_json", sa.Text(), nullable=True),
        sa.Column("issues_found_json", sa.Text(), nullable=True),
        sa.Column("opportunity_summary", sa.Text(), nullable=True),
        sa.Column("performance_score", sa.Integer(), server_default="70"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_website_audits_company_id", "website_audits", ["company_id"])

    # 10. email_drafts
    op.create_table(
        "email_drafts",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("lead_id", sa.String(length=64), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject", sa.String(length=300), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("evidence_urls_json", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), server_default="0.8"),
        sa.Column("model", sa.String(length=100), server_default="gemini-1.5-flash"),
        sa.Column("status", sa.String(length=50), server_default="pending_review"),
        sa.Column("approval_hash", sa.String(length=64), nullable=True),
        sa.Column("approved_by", sa.String(length=200), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_email_drafts_lead_id", "email_drafts", ["lead_id"])

    # 11. email_approvals
    op.create_table(
        "email_approvals",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("draft_id", sa.String(length=64), sa.ForeignKey("email_drafts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("approver_email", sa.String(length=255), nullable=False),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("sender_identity", sa.String(length=255), server_default="outreach@leadpilot.ai"),
        sa.Column("subject", sa.String(length=300), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("approved_at", sa.DateTime(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_email_approvals_draft_id", "email_approvals", ["draft_id"])

    # 12. email_events
    op.create_table(
        "email_events",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("draft_id", sa.String(length=64), sa.ForeignKey("email_drafts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("provider", sa.String(length=50), server_default="mock_smtp"),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
    )
    op.create_index("ix_email_events_draft_id", "email_events", ["draft_id"])

    # 13. suppressions
    op.create_table(
        "suppressions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("workspace_id", sa.String(length=64), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email_normalized", sa.String(length=255), nullable=False),
        sa.Column("domain_normalized", sa.String(length=255), nullable=True),
        sa.Column("reason", sa.String(length=100), server_default="opt_out"),
        sa.Column("source", sa.String(length=100), server_default="user_action"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_suppressions_workspace_id", "suppressions", ["workspace_id"])
    op.create_index("ix_suppressions_email_normalized", "suppressions", ["email_normalized"])
    op.create_index("ix_suppressions_domain_normalized", "suppressions", ["domain_normalized"])

    # 14. integration_connections
    op.create_table(
        "integration_connections",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("workspace_id", sa.String(length=64), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_name", sa.String(length=50), nullable=False),
        sa.Column("encrypted_credentials", sa.Text(), nullable=True),
        sa.Column("config_json", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="false"),
        sa.Column("last_tested_at", sa.DateTime(), nullable=True),
        sa.Column("status_message", sa.String(length=255), server_default="Ready to configure"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_integration_connections_workspace_id", "integration_connections", ["workspace_id"])
    op.create_index("ix_integration_connections_provider_name", "integration_connections", ["provider_name"])

    # 15. audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("workspace_id", sa.String(length=64), nullable=False),
        sa.Column("user_email", sa.String(length=255), server_default="user@leadpilot.ai"),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_audit_logs_workspace_id", "audit_logs", ["workspace_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("integration_connections")
    op.drop_table("suppressions")
    op.drop_table("email_events")
    op.drop_table("email_approvals")
    op.drop_table("email_drafts")
    op.drop_table("website_audits")
    op.drop_table("source_evidence")
    op.drop_table("leads")
    op.drop_table("contacts")
    op.drop_table("companies")
    op.drop_table("campaigns")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
    op.drop_table("users")
