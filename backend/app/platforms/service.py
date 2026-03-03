import logging

from fastapi import HTTPException, status

from .mock import get_platform_data
from .schemas import PLATFORM_CONFIGS

logger = logging.getLogger(__name__)


def _zabbix_unavailable_dashboard() -> dict:
    return {
        "_live": False,
        "kpis": {
            "totalHosts": {"value": 0, "trend": 0, "label": "Total Hosts"},
            "hostsUp": {"value": 0, "trend": 0, "label": "Hosts Up"},
            "hostsDown": {"value": 0, "trend": 0, "label": "Hosts Down"},
            "hostsDisabled": {"value": 0, "trend": 0, "label": "Hosts Disabled"},
            "activeTriggers": {"value": 0, "trend": 0, "label": "Active Triggers"},
            "problems1h": {"value": 0, "trend": 0, "label": "Problems (1h)"},
            "avgAvailability": {"value": "0.00%", "trend": 0, "label": "Avg Availability"},
        },
        "availabilityTrend": [],
        "networkThroughput": [],
        "triggersBySeverity": [],
        "hostGroupStatus": [],
        "activeProblems": [],
    }


def get_all_platforms() -> list[dict]:
    return PLATFORM_CONFIGS


def get_dashboard(platform_id: str) -> dict:
    mock = get_platform_data(platform_id)

    if platform_id == "crowdstrike":
        from app.config import settings
        if settings.crowdstrike_client_id:
            try:
                from app.integrations.crowdstrike import cs_client
                return cs_client.fetch_dashboard(mock)
            except Exception as e:
                logger.warning("CrowdStrike live fetch failed, falling back to mock: %s", e)

    if platform_id == "zabbix":
        from app.config import settings
        if settings.zabbix_url and settings.zabbix_api_token:
            try:
                from app.integrations.zabbix import zabbix_client
                if zabbix_client is not None:
                    return zabbix_client.fetch_dashboard(mock)
            except Exception as e:
                logger.warning("Zabbix live fetch failed, returning CAP-unavailable payload: %s", e)
                return _zabbix_unavailable_dashboard()
        return _zabbix_unavailable_dashboard()

    if platform_id == "outpost24":
        from app.config import settings
        if settings.outpost24_url and settings.outpost24_username:
            try:
                from app.integrations.outpost24 import outpost24_client
                if outpost24_client is not None:
                    return outpost24_client.fetch_dashboard(mock)
            except Exception as e:
                logger.warning("Outpost24 live fetch failed, falling back to mock: %s", e)

    if platform_id == "wazuh":
        from app.config import settings
        if settings.wazuh_dashboard_url and settings.wazuh_username:
            try:
                from app.integrations.wazuh import wazuh_client
                if wazuh_client is not None:
                    return wazuh_client.fetch_dashboard(mock)
            except Exception as e:
                logger.warning("Wazuh SIEM live fetch failed, falling back to mock: %s", e)

    if platform_id == "keeper":
        from app.config import settings
        if settings.keeper_email and settings.keeper_password:
            try:
                from app.integrations.keeper import keeper_client
                if keeper_client is not None:
                    return keeper_client.fetch_dashboard(mock)
                from app.integrations.keeper import _unavailable_payload
                return _unavailable_payload(settings.keeper_client_filter, "Keeper client failed to initialize")
            except Exception as e:
                logger.warning("Keeper live fetch failed: %s", e)
                from app.integrations.keeper import _unavailable_payload
                return _unavailable_payload(settings.keeper_client_filter, str(e))

    return mock


def get_cs_devices(page: int, limit: int, platform: str, device_type: str = "", search: str = "") -> dict:
    from app.integrations.crowdstrike import cs_client
    return {"platform_id": "crowdstrike", **cs_client.fetch_devices_page(page, limit, platform, device_type, search)}


def contain_cs_device(device_id: str) -> dict:
    from app.integrations.crowdstrike import cs_client
    return cs_client.contain_device(device_id)


def lift_cs_containment(device_id: str) -> dict:
    from app.integrations.crowdstrike import cs_client
    return cs_client.lift_containment(device_id)


def get_cs_detections(page: int, limit: int, severity: str, status: str) -> dict:
    from app.integrations.crowdstrike import cs_client
    return {"platform_id": "crowdstrike", **cs_client.fetch_alerts_page(page, limit, severity, status)}


def get_cs_incidents(page: int, limit: int) -> dict:
    from app.integrations.crowdstrike import cs_client
    return {"platform_id": "crowdstrike", **cs_client.fetch_incidents_page(page, limit)}


def get_zabbix_triggers(page: int, limit: int, severity: str) -> dict:
    from app.integrations.zabbix import zabbix_client
    if zabbix_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CAP scope unavailable: Zabbix integration is not configured.",
        )
    if getattr(zabbix_client, "is_scope_unavailable", lambda: False)():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CAP scope unavailable: ZABBIX_GROUP=CAP could not be resolved in Zabbix.",
        )
    try:
        return {"platform_id": "zabbix", **zabbix_client.get_triggers_page(page, limit, severity)}
    except Exception as exc:
        logger.warning("Zabbix triggers fetch failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CAP scope unavailable or Zabbix API is down.",
        )


def get_zabbix_hosts(page: int, limit: int, search: str) -> dict:
    from app.integrations.zabbix import zabbix_client
    if zabbix_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CAP scope unavailable: Zabbix integration is not configured.",
        )
    if getattr(zabbix_client, "is_scope_unavailable", lambda: False)():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CAP scope unavailable: ZABBIX_GROUP=CAP could not be resolved in Zabbix.",
        )
    try:
        return {"platform_id": "zabbix", **zabbix_client.get_hosts_page(page, limit, search)}
    except Exception as exc:
        logger.warning("Zabbix hosts fetch failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CAP scope unavailable or Zabbix API is down.",
        )


# ── Wazuh SIEM helpers ─────────────────────────────────────────────── #

def get_wazuh_alerts(page: int, limit: int, severity: str, rule_id: str = "") -> dict:
    from app.integrations.wazuh import wazuh_client
    if wazuh_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wazuh SIEM integration is not configured.",
        )
    try:
        return {"platform_id": "wazuh", **wazuh_client.get_alerts_page(page, limit, severity, rule_id)}
    except Exception as exc:
        logger.warning("Wazuh alerts fetch failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wazuh SIEM API is down or unreachable.",
        )


def get_wazuh_agents(page: int, limit: int, search: str) -> dict:
    from app.integrations.wazuh import wazuh_client
    if wazuh_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wazuh SIEM integration is not configured.",
        )
    try:
        return {"platform_id": "wazuh", **wazuh_client.get_agents_page(page, limit, search)}
    except Exception as exc:
        logger.warning("Wazuh agents fetch failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wazuh SIEM API is down or unreachable.",
        )


def get_wazuh_alert_volume() -> dict:
    from app.integrations.wazuh import wazuh_client
    if wazuh_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wazuh SIEM integration is not configured.",
        )
    try:
        return {"platform_id": "wazuh", **wazuh_client.get_alert_volume()}
    except Exception as exc:
        logger.warning("Wazuh alert volume fetch failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Wazuh SIEM API is down or unreachable.",
        )


def get_incidents(platform_id: str, page: int, limit: int, severity: str | None) -> dict:
    data = get_platform_data(platform_id)

    # Find the incidents/alerts/problems table in the response
    items: list[dict] = []
    for key in ("recentDetections", "recentAlerts", "recentViolations", "assetRiskRankings", "highRiskUsers", "activeProblems"):
        if key in data:
            items = data[key]
            break

    # Filter by severity if requested
    if severity:
        items = [it for it in items if str(it.get("severity", it.get("level", ""))).lower() == severity.lower()]

    total = len(items)
    start = (page - 1) * limit
    return {
        "platform_id": platform_id,
        "page": page,
        "limit": limit,
        "total": total,
        "items": items[start : start + limit],
    }


def get_timeseries(platform_id: str, metric: str, hours: int) -> dict:
    from .mock.helpers import generate_time_series
    data = get_platform_data(platform_id)

    # Try to find a matching time series key
    series_keys = {
        "detections": "detectionTrend",
        "alerts": "alertTrend",
        "transfers": "transferTrend",
        "availability": "availabilityTrend",
        "score": "scoreHistory",
    }
    key = series_keys.get(metric)
    if key and key in data:
        ts_data = data[key][:hours] if len(data[key]) >= hours else data[key]
    else:
        ts_data = generate_time_series(min(hours, 48), 50, 20)

    return {
        "platform_id": platform_id,
        "metric": metric,
        "hours": hours,
        "data": ts_data,
    }
