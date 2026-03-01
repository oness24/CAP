from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.auth.router import router as auth_router
from app.platforms.router import router as platforms_router
from app.executive.router import router as executive_router

# Create all tables on startup (development convenience)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CAP_DASH API",
    description="Unified Security Operations Dashboard — REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=f"{API_PREFIX}/auth", tags=["auth"])
app.include_router(platforms_router, prefix=f"{API_PREFIX}/platforms", tags=["platforms"])
app.include_router(executive_router, prefix=f"{API_PREFIX}/executive", tags=["executive"])


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/_debug/zabbix", tags=["health"])
def zabbix_debug():
    if settings.environment.lower() not in {"development", "dev", "test"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    from app.integrations.zabbix import zabbix_client
    return {
        "zabbix_url": settings.zabbix_url,
        "has_token": bool(settings.zabbix_api_token),
        "zabbix_group": settings.zabbix_group,
        "client_created": zabbix_client is not None,
        "group_ids": zabbix_client._group_ids if zabbix_client else None,
    }
