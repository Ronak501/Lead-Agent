import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine, Base, SessionLocal
from .routes import router
from .schemas import ApiStatus
from .seed import seed_database
from .automation_service import AutomationEngine

logger = logging.getLogger("leadpilot.main")


async def periodic_automation_loop():
    """Runs autonomous lead discovery, outbound sending, and reply checking periodically."""
    logger.info(f"Autonomous worker started (Interval: {settings.AUTOPILOT_INTERVAL_MINUTES} minutes)")
    
    # Run initial cycle after brief startup grace period (5s)
    await asyncio.sleep(5)
    
    while True:
        try:
            if settings.AUTOPILOT_AUTO_RUN:
                logger.info("⚡ Executing autonomous lead discovery, outreach & reply check cycle...")
                db = SessionLocal()
                try:
                    res = await AutomationEngine.run_full_cycle(db)
                    logger.info(f"Autonomous cycle finished: {res}")
                finally:
                    db.close()
            
            # Wait for next scheduled interval
            await asyncio.sleep(settings.AUTOPILOT_INTERVAL_MINUTES * 60)
        except asyncio.CancelledError:
            logger.info("Autonomous worker shutting down.")
            break
        except Exception as e:
            logger.error(f"Error in background automation worker: {str(e)}")
            await asyncio.sleep(60)  # Wait 1 minute before retrying on failure


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup
    Base.metadata.create_all(bind=engine)
    # Seed default workspace and sample verified data if empty
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # Start autonomous worker if enabled
    worker_task = None
    if settings.AUTOPILOT_AUTO_RUN:
        worker_task = asyncio.create_task(periodic_automation_loop())

    yield

    if worker_task:
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="LeadPilot AI API",
    version="1.0.0",
    description="Human-approved AI prospecting and cold-email SaaS platform.",
    lifespan=lifespan,
)

cors_origins = [origin.strip() for origin in settings.API_CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"^https://.*\.run\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    """Root endpoint welcoming users and directing to API documentation and health check."""
    return {
        "app": "LeadPilot AI API",
        "status": "online",
        "organization": "Ornitech Solutions (@ornitech.in)",
        "version": "1.0.0",
        "documentation": "/docs",
        "health_check": "/health",
        "endpoints": {
            "campaigns": "/api/campaigns",
            "leads": "/api/leads",
            "drafts": "/api/drafts",
            "automation_status": "/api/automation/status",
            "automation_run_cycle": "/api/automation/run-cycle",
        },
    }


@app.get("/health", response_model=ApiStatus)
async def health():
    return ApiStatus(
        status="ok",
        app="LeadPilot AI API",
        version="1.0.0",
        environment=settings.APP_ENV,
        database="connected",
        email_sending_enabled=settings.EMAIL_SENDING_ENABLED,
        notes=[
            "Strict evidence grounding active",
            "Human approval mandatory for outbound drafts",
            "Suppression checks enforced at workspace level",
        ],
    )
