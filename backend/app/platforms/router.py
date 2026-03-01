from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.dependencies import get_current_user
from app.auth.models import User
from .schemas import VALID_PLATFORM_IDS, DashboardResponse, IncidentsResponse, PagedResponse, PlatformConfig, TimeSeriesResponse
from .service import (
    get_all_platforms, get_cs_detections, get_cs_devices, get_cs_incidents,
    get_dashboard, get_incidents, get_timeseries,
    contain_cs_device, lift_cs_containment,
    get_zabbix_triggers, get_zabbix_hosts,
    get_wazuh_alerts, get_wazuh_agents, get_wazuh_alert_volume,
)

router = APIRouter()

AuthDep = Annotated[User, Depends(get_current_user)]


def _validate_platform(platform_id: str) -> str:
    if platform_id not in VALID_PLATFORM_IDS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Platform '{platform_id}' not found. Valid: {sorted(VALID_PLATFORM_IDS)}",
        )
    return platform_id


@router.get("/", response_model=list[PlatformConfig])
def list_platforms(_: AuthDep):
    return get_all_platforms()


@router.get("/{platform_id}/dashboard", response_model=DashboardResponse)
def platform_dashboard(platform_id: str, _: AuthDep):
    _validate_platform(platform_id)
    return DashboardResponse(platform_id=platform_id, data=get_dashboard(platform_id))


@router.get("/{platform_id}/incidents", response_model=IncidentsResponse)
def platform_incidents(
    platform_id: str,
    _: AuthDep,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    severity: str | None = Query(None),
):
    _validate_platform(platform_id)
    return get_incidents(platform_id, page, limit, severity)


@router.get("/crowdstrike/devices", response_model=PagedResponse)
def cs_devices(
    _: AuthDep,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    platform: str = Query(""),
    device_type: str = Query(""),
    search: str = Query(""),
):
    return get_cs_devices(page, limit, platform, device_type, search)


@router.post("/crowdstrike/devices/{device_id}/contain")
def cs_contain(_: AuthDep, device_id: str):
    return contain_cs_device(device_id)


@router.post("/crowdstrike/devices/{device_id}/lift-containment")
def cs_lift_containment(_: AuthDep, device_id: str):
    return lift_cs_containment(device_id)


@router.get("/crowdstrike/detections", response_model=PagedResponse)
def cs_detections(
    _: AuthDep,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    severity: str = Query(""),
    status: str = Query(""),
):
    return get_cs_detections(page, limit, severity, status)


@router.get("/crowdstrike/real-incidents", response_model=PagedResponse)
def cs_real_incidents(
    _: AuthDep,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    return get_cs_incidents(page, limit)


@router.get("/zabbix/triggers", response_model=PagedResponse)
def zabbix_triggers(
    _: AuthDep,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    severity: str = Query(""),
):
    return get_zabbix_triggers(page, limit, severity)


@router.get("/zabbix/hosts", response_model=PagedResponse)
def zabbix_hosts(
    _: AuthDep,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query(""),
):
    return get_zabbix_hosts(page, limit, search)


# ── Wazuh SIEM endpoints ──────────────────────────────────────────── #

@router.get("/wazuh/alerts", response_model=PagedResponse)
def wazuh_alerts(
    _: AuthDep,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    severity: str = Query(""),
    rule_id: str = Query(""),
):
    return get_wazuh_alerts(page, limit, severity, rule_id)


@router.get("/wazuh/agents", response_model=PagedResponse)
def wazuh_agents(
    _: AuthDep,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query(""),
):
    return get_wazuh_agents(page, limit, search)


@router.get("/wazuh/alert-volume")
def wazuh_alert_volume(_: AuthDep):
    return get_wazuh_alert_volume()


@router.get("/{platform_id}/timeseries", response_model=TimeSeriesResponse)
def platform_timeseries(
    platform_id: str,
    _: AuthDep,
    metric: str = Query("detections"),
    hours: int = Query(24, ge=1, le=168),
):
    _validate_platform(platform_id)
    return get_timeseries(platform_id, metric, hours)
