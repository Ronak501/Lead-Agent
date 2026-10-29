import logging
from sqlalchemy.orm import Session
from .config import settings
from .models import (
    User,
    Workspace,
    WorkspaceMember,
    Campaign,
    Company,
    Contact,
    Lead,
    Evidence,
    WebsiteAudit,
    EmailDraft,
    Suppression,
)
from .auth import hash_password

logger = logging.getLogger("leadpilot.seed")


def seed_database(db: Session, workspace_id: str = "ws_default_01"):
    """
    Initializes core production workspace and authorized users.
    Strictly removes all legacy mock, sample, and demo records so the system runs on 100% real data.
    """
    # 1. Clean up any legacy demo data from database
    demo_camp = db.query(Campaign).filter_by(id="cmp_india_saas_01").first()
    if demo_camp:
        logger.info("Cleaning up legacy demo campaign and cascading records...")
        db.delete(demo_camp)

    demo_domains = [
        "kavachlogistics.in",
        "zenithmetrics.io",
        "pinnaclediagnostics.com",
        "velocefleet.tech",
        "blesso.ai",
        "example.com",
    ]
    demo_comps = db.query(Company).filter(Company.domain.in_(demo_domains)).all()
    if demo_comps:
        for c in demo_comps:
            db.delete(c)

    demo_sup = db.query(Suppression).filter_by(domain_normalized="competitor.com").first()
    if demo_sup:
        db.delete(demo_sup)

    legacy_user = db.query(User).filter_by(email="founder@leadpilot.ai").first()
    if legacy_user:
        db.delete(legacy_user)

    db.commit()

    # 2. Ensure Default Enterprise Workspace
    ws = db.query(Workspace).filter_by(id=workspace_id).first()
    if not ws:
        ws = Workspace(
            id=workspace_id,
            name="Ornitech Solutions",
            owner_email="founder@ornitech.in",
            plan="growth",
        )
        db.add(ws)
        db.commit()

    # 3. Ensure Authorized Admin Users with Secure Passwords
    admin_users = [
        {
            "id": "usr_admin_ronak",
            "email": "ronaktalaviya51@gmail.com",
            "full_name": "Ronak Talaviya",
            "role": "owner",
        },
        {
            "id": "usr_founder_ornitech",
            "email": "founder@ornitech.in",
            "full_name": "Ornitech Founder",
            "role": "admin",
        },
    ]

    for u_info in admin_users:
        u = db.query(User).filter_by(email=u_info["email"]).first()
        if not u:
            u = User(
                id=u_info["id"],
                email=u_info["email"],
                full_name=u_info["full_name"],
                is_active=True,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
            )
            db.add(u)
            db.flush()
        else:
            if not u.hashed_password:
                u.hashed_password = hash_password(settings.ADMIN_PASSWORD)
                db.flush()

        # Ensure workspace membership
        mem = db.query(WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=u.id).first()
        if not mem:
            mem = WorkspaceMember(
                workspace_id=workspace_id,
                user_id=u.id,
                role=u_info["role"],
            )
            db.add(mem)

    db.commit()
    logger.info("Database initialized with clean schema and authorized admins (zero demo data).")
