"""
CrowdStrike Falcon API client.

Strategy: TTL cache (120s) — first request fetches live data and primes
the cache; subsequent requests within the TTL return instantly from cache.
A background thread refreshes the cache before expiry so the UI is never
blocked waiting for the CrowdStrike API.

Confirmed working endpoints (us-2 tenant):
  - /devices/queries/devices/v1          (GET)  — device IDs + counts
  - /alerts/queries/alerts/v1            (GET)  — alert IDs + counts
  - /alerts/entities/alerts/v1           (POST) — alert details
  - /incidents/queries/incidents/v1      (GET)  — incident IDs + counts
"""

import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

_CACHE_TTL = 120  # seconds — refresh every 2 minutes

import httpx

from app.config import settings

# Shared connection pool — reuses TLS sessions across all API calls
_http_client: httpx.Client | None = None
_http_lock = Lock()


def _get_http_client() -> httpx.Client:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        with _http_lock:
            if _http_client is None or _http_client.is_closed:
                _http_client = httpx.Client(
                    base_url=settings.crowdstrike_base_url,
                    timeout=httpx.Timeout(15.0),
                    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
                )
    return _http_client

logger = logging.getLogger(__name__)

# ── Module-level TTL cache (one process, one cache) ───────────────────────────
_dashboard_cache: dict | None = None
_dashboard_cache_at: float = 0.0
_dashboard_cache_lock = Lock()
_dashboard_refreshing: bool = False

_SEVERITY_MAP = {
    "Critical": "Critical",
    "High": "High",
    "Medium": "Medium",
    "Low": "Low",
    "Informational": "Low",
    "Unknown": "Low",
}

_SEVERITY_LEVELS = [
    ("Critical", "#EF4444"),
    ("High",     "#F97316"),
    ("Medium",   "#EAB308"),
    ("Low",      "#22C55E"),
]

_OS_FILTERS = [
    ("Windows", "platform_name:'Windows'"),
    ("macOS",   "platform_name:'Mac'"),
    ("Linux",   "platform_name:'Linux'"),
]

_DEVICE_TYPE_FILTERS = [
    ("Server",      "product_type_desc:'Server'"),
    ("Workstation", "product_type_desc:'Workstation'"),
    ("DC",          "product_type_desc:'Domain Controller'"),
]


class CrowdStrikeClient:
    """Synchronous CrowdStrike Falcon API client with token caching."""

    def __init__(self) -> None:
        self._token: str | None = None
        self._token_expiry: float = 0.0
        self._lock = Lock()

    # ── Auth ──────────────────────────────────────────────────────────────────

    def _refresh_token(self) -> str:
        client = _get_http_client()
        resp = client.post(
            "/oauth2/token",
            data={
                "client_id": settings.crowdstrike_client_id,
                "client_secret": settings.crowdstrike_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        payload = resp.json()
        self._token = payload["access_token"]
        self._token_expiry = time.monotonic() + payload.get("expires_in", 1799)
        return self._token

    def _get_token(self) -> str:
        with self._lock:
            if self._token and time.monotonic() < self._token_expiry - 60:
                return self._token
            return self._refresh_token()

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._get_token()}"}

    # ── HTTP helpers ──────────────────────────────────────────────────────────

    def _get(self, path: str, params: dict | None = None) -> dict:
        resp = _get_http_client().get(path, headers=self._headers(), params=params or {})
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, body: dict) -> dict:
        resp = _get_http_client().post(path, headers=self._headers(), json=body)
        resp.raise_for_status()
        return resp.json()

    def _total(self, data: dict) -> int:
        return data.get("meta", {}).get("pagination", {}).get("total", 0)

    # ── Individual fetchers (each is one or two HTTP calls) ───────────────────

    def _fetch_device_count(self) -> int:
        return self._total(self._get("/devices/queries/devices/v1", {"limit": 1}))

    def _fetch_active_alert_count(self) -> int:
        return self._total(
            self._get("/alerts/queries/alerts/v1",
                      {"filter": "status:'new',status:'in_progress'", "limit": 1})
        )

    def _fetch_open_incident_count(self) -> int:
        return self._total(self._get("/incidents/queries/incidents/v1", {"limit": 1}))

    def _fetch_critical_alert_count(self) -> int:
        return self._total(
            self._get("/alerts/queries/alerts/v1",
                      {"filter": "severity_name:'Critical'", "limit": 1})
        )

    def _fetch_severity_count(self, name: str) -> int:
        return self._total(
            self._get("/alerts/queries/alerts/v1",
                      {"filter": f"severity_name:'{name}'", "limit": 1})
        )

    def _fetch_os_count(self, fql: str) -> int:
        return self._total(
            self._get("/devices/queries/devices/v1", {"filter": fql, "limit": 1})
        )

    def _fetch_recent_alerts(self, limit: int = 10) -> list[dict]:
        id_data = self._get("/alerts/queries/alerts/v1",
                            {"sort": "created_timestamp.desc", "limit": limit})
        ids: list[str] = id_data.get("resources", [])
        if not ids:
            return []
        detail_data = self._post("/alerts/entities/alerts/v1", {"ids": ids})
        alerts = []
        for a in detail_data.get("resources", []):
            tactic    = a.get("tactic", "")
            technique = a.get("technique", "")
            label = (
                f"{tactic} — {technique}" if tactic and technique
                else technique or tactic or a.get("name", "Unknown")
            )
            alerts.append({
                "id":        a.get("composite_id", a.get("id", "")),
                "hostname":  a.get("device", {}).get("hostname", "Unknown"),
                "technique": label,
                "severity":  _SEVERITY_MAP.get(a.get("severity_name", ""), "Medium"),
                "status":    a.get("status", "new").replace("_", " ").title(),
                "timestamp": a.get("created_timestamp", ""),
                "analyst":   a.get("user_name") or "Unassigned",
            })
        return alerts

    # ── TTL cache ─────────────────────────────────────────────────────────────

    def _is_cache_valid(self) -> bool:
        return _dashboard_cache is not None and time.monotonic() - _dashboard_cache_at < _CACHE_TTL

    def _schedule_background_refresh(self, mock_base: dict) -> None:
        """Start a daemon thread to refresh the cache without blocking."""
        global _dashboard_refreshing
        if _dashboard_refreshing:
            return
        _dashboard_refreshing = True

        def _refresh():
            global _dashboard_cache, _dashboard_cache_at, _dashboard_refreshing
            try:
                fresh = self._build_payload(mock_base)
                with _dashboard_cache_lock:
                    _dashboard_cache = fresh
                    _dashboard_cache_at = time.monotonic()
            except Exception as e:
                logger.warning("CS background refresh failed: %s", e)
            finally:
                _dashboard_refreshing = False

        t = threading.Thread(target=_refresh, daemon=True)
        t.start()

    def fetch_dashboard(self, mock_base: dict) -> dict:
        """
        Return cached CrowdStrike data if fresh, otherwise fetch live data.
        After the first successful fetch the cache is always returned immediately
        and refreshed in the background every _CACHE_TTL seconds.
        """
        global _dashboard_cache, _dashboard_cache_at

        # Return cache if valid
        if self._is_cache_valid():
            # Schedule a background refresh when cache is 75% through TTL
            if time.monotonic() - _dashboard_cache_at > _CACHE_TTL * 0.75:
                self._schedule_background_refresh(mock_base)
            return _dashboard_cache  # type: ignore[return-value]

        # First call or expired cache — block and fetch live data
        with _dashboard_cache_lock:
            # Double-check after acquiring lock
            if self._is_cache_valid():
                return _dashboard_cache  # type: ignore[return-value]
            logger.info("CS: fetching live dashboard data (cache cold/expired)")
            payload = self._build_payload(mock_base)
            _dashboard_cache = payload
            _dashboard_cache_at = time.monotonic()
            return payload

    # ── Full dashboard (parallel) ─────────────────────────────────────────────

    def _build_payload(self, mock_base: dict) -> dict:
        """
        Build a dashboard payload by merging live CrowdStrike data into
        the mock baseline. All API calls run in parallel via ThreadPoolExecutor.
        Any individual call that fails keeps its mock value.
        """
        data = dict(mock_base)
        kpis = dict(data.get("kpis", {}))

        # Define all tasks: (key, callable)
        tasks = {
            "device_count":    self._fetch_device_count,
            "active_alerts":   self._fetch_active_alert_count,
            "open_incidents":  self._fetch_open_incident_count,
            "critical_alerts": self._fetch_critical_alert_count,
            "recent_alerts":   lambda: self._fetch_recent_alerts(10),
            # Severity breakdown (4 parallel sub-calls)
            **{f"sev_{name}": (lambda n=name: self._fetch_severity_count(n))
               for name, _ in _SEVERITY_LEVELS},
            # OS breakdown (3 parallel sub-calls)
            **{f"os_{label}": (lambda f=fql: self._fetch_os_count(f))
               for label, fql in _OS_FILTERS},
            # Device type breakdown (3 parallel sub-calls)
            **{f"type_{label}": (lambda f=fql: self._fetch_os_count(f))
               for label, fql in _DEVICE_TYPE_FILTERS},
        }

        results: dict = {}
        with ThreadPoolExecutor(max_workers=12) as pool:
            future_to_key = {pool.submit(fn): key for key, fn in tasks.items()}
            for future in as_completed(future_to_key):
                key = future_to_key[future]
                try:
                    results[key] = future.result()
                except Exception as e:
                    logger.warning("CS task '%s' failed: %s", key, e)

        # ── Apply results ──────────────────────────────────────────────────────

        if "device_count" in results:
            kpis["totalEndpoints"] = {
                **kpis.get("totalEndpoints", {}),
                "value": f"{results['device_count']:,}",
            }

        if "active_alerts" in results:
            kpis["activeDetections"] = {
                **kpis.get("activeDetections", {}),
                "value": results["active_alerts"],
            }

        if "open_incidents" in results:
            kpis["openIncidents"] = {
                **kpis.get("openIncidents", {}),
                "value": results["open_incidents"],
            }

        if "critical_alerts" in results:
            kpis["criticalAlerts"] = {
                **kpis.get("criticalAlerts", {}),
                "value": results["critical_alerts"],
            }

        data["kpis"] = kpis
        data["_live"] = True

        # Severity breakdown
        breakdown = []
        for name, color in _SEVERITY_LEVELS:
            count = results.get(f"sev_{name}", 0)
            breakdown.append({"name": name, "value": count, "color": color})
        if any(r["value"] for r in breakdown):
            data["severityBreakdown"] = breakdown

        # Devices by OS
        by_os = []
        for label, _ in _OS_FILTERS:
            count = results.get(f"os_{label}", 0)
            if count:
                by_os.append({"os": label, "count": count})
        if by_os:
            data["endpointsByOS"] = by_os

        # Devices by type (Server / Workstation / DC)
        by_type = []
        for label, _ in _DEVICE_TYPE_FILTERS:
            count = results.get(f"type_{label}", 0)
            by_type.append({"type": label, "count": count})
        if any(r["count"] for r in by_type):
            data["endpointsByType"] = by_type

        # Recent alerts
        if "recent_alerts" in results and results["recent_alerts"]:
            data["recentDetections"] = results["recent_alerts"]

        return data


    # ── Paginated devices ──────────────────────────────────────────────────────

    def fetch_devices_page(
        self, page: int = 1, limit: int = 25,
        platform: str = "", device_type: str = "", search: str = ""
    ) -> dict:
        """Return a paginated list of devices with full entity details (v2)."""
        params: dict = {"limit": limit, "offset": (page - 1) * limit}
        filters = []
        if platform:
            filters.append(f"platform_name:'{platform}'")
        if device_type:
            filters.append(f"product_type_desc:'{device_type}'")
        if search:
            filters.append(f"hostname:*'{search}'*")
        if filters:
            params["filter"] = "+".join(filters)

        id_data = self._get("/devices/queries/devices/v1", params)
        ids: list[str] = id_data.get("resources", [])
        total = self._total(id_data)
        if not ids:
            return {"total": total, "page": page, "limit": limit, "items": []}
        try:
            detail_resp = _get_http_client().get(
                "/devices/entities/devices/v2",
                headers=self._headers(),
                params=[("ids", i) for i in ids],
            )
            detail_resp.raise_for_status()
            devices = []
            for d in detail_resp.json().get("resources", []):
                raw_status = d.get("status", "unknown")
                devices.append({
                    "id":              d.get("device_id", ""),
                    "hostname":        d.get("hostname", "Unknown"),
                    "device_type":     d.get("product_type_desc", "Unknown"),
                    "platform":        d.get("platform_name", "Unknown"),
                    "os":              d.get("os_version", ""),
                    "status":          "Online" if raw_status == "normal" else raw_status.replace("_", " ").title(),
                    "last_seen":       d.get("last_seen", ""),
                    "first_seen":      d.get("first_seen", ""),
                    "local_ip":        d.get("local_ip", ""),
                    "external_ip":     d.get("external_ip", ""),
                    "agent_version":   d.get("agent_version", ""),
                    "last_login_user": d.get("last_login_user", ""),
                    "machine_domain":  d.get("machine_domain", ""),
                    "manufacturer":    d.get("system_manufacturer", ""),
                    "model":           d.get("system_product_name", ""),
                    "serial_number":   d.get("serial_number", ""),
                    "bios_version":    d.get("bios_version", ""),
                    "bios_manufacturer": d.get("bios_manufacturer", ""),
                    "mac_address":     d.get("mac_address", "").upper().replace(":", "-"),
                    "tags":            d.get("tags", []),
                    "chassis_type":    d.get("chassis_type_desc", ""),
                })
            return {"total": total, "page": page, "limit": limit, "items": devices}
        except Exception as e:
            logger.warning("CS device entities fetch failed: %s", e)
            return {"total": total, "page": page, "limit": limit, "items": []}

    # ── Paginated alerts (detections) ──────────────────────────────────────────

    def fetch_alerts_page(
        self, page: int = 1, limit: int = 25, severity: str = "", status: str = ""
    ) -> dict:
        """Return a paginated list of alerts with full details."""
        params: dict = {
            "sort": "created_timestamp.desc",
            "limit": limit,
            "offset": (page - 1) * limit,
        }
        filters = []
        if severity:
            filters.append(f"severity_name:'{severity}'")
        if status:
            filters.append(f"status:'{status}'")
        if filters:
            params["filter"] = "+".join(filters)

        id_data = self._get("/alerts/queries/alerts/v1", params)
        ids: list[str] = id_data.get("resources", [])
        total = self._total(id_data)
        if not ids:
            return {"total": total, "page": page, "limit": limit, "items": []}

        detail_data = self._post("/alerts/entities/alerts/v1", {"ids": ids})
        items = []
        for a in detail_data.get("resources", []):
            tactic    = a.get("tactic", "")
            technique = a.get("technique", "")
            label = (
                f"{tactic} — {technique}" if tactic and technique
                else technique or tactic or a.get("name", "Unknown")
            )
            items.append({
                "id":          a.get("composite_id", a.get("id", "")),
                "hostname":    a.get("device", {}).get("hostname", "Unknown"),
                "technique":   label,
                "tactic":      tactic,
                "severity":    _SEVERITY_MAP.get(a.get("severity_name", ""), "Medium"),
                "severity_raw": a.get("severity_name", ""),
                "status":      a.get("status", "new").replace("_", " ").title(),
                "timestamp":   a.get("created_timestamp", ""),
                "analyst":     a.get("user_name") or "Unassigned",
                "description": a.get("description", ""),
                "platform":    a.get("device", {}).get("platform_name", ""),
            })
        return {"total": total, "page": page, "limit": limit, "items": items}

    # ── Paginated incidents ────────────────────────────────────────────────────

    def fetch_incidents_page(self, page: int = 1, limit: int = 25) -> dict:
        """Return a paginated list of incidents with entity details when available."""
        params: dict = {"limit": limit, "offset": (page - 1) * limit}
        id_data = self._get("/incidents/queries/incidents/v1", params)
        ids: list[str] = id_data.get("resources", [])
        total = self._total(id_data)
        if not ids:
            return {"total": total, "page": page, "limit": limit, "items": []}
        try:
            detail_data = self._post("/incidents/entities/incidents/v1", {"ids": ids})
            _STATUS_MAP = {1: "New", 10: "In Progress", 20: "Closed", 25: "Closed", 30: "Reopened"}
            items = []
            for inc in detail_data.get("resources", []):
                items.append({
                    "id":          inc.get("incident_id", ""),
                    "name":        inc.get("name", ""),
                    "status":      _STATUS_MAP.get(inc.get("status"), str(inc.get("status", "Unknown"))),
                    "severity":    inc.get("fine_score", inc.get("severity", 0)),
                    "tactics":     inc.get("tactics", []),
                    "techniques":  inc.get("techniques", []),
                    "hosts":       [h.get("hostname", "") for h in inc.get("hosts", [])],
                    "users":       inc.get("users", []),
                    "start":       inc.get("start", ""),
                    "end":         inc.get("end", ""),
                    "assigned_to": inc.get("assigned_to_name") or "Unassigned",
                    "description": inc.get("description", ""),
                })
            return {"total": total, "page": page, "limit": limit, "items": items}
        except Exception as e:
            logger.warning("CS incident entities fetch failed: %s", e)
            return {"total": total, "page": page, "limit": limit, "items": []}

    def contain_device(self, device_id: str) -> dict:
        """Contain a host (network isolation) via CrowdStrike."""
        resp = _get_http_client().post(
            "/devices/entities/devices-actions/v2",
            headers=self._headers(),
            params={"action_name": "contain"},
            json={"ids": [device_id]},
        )
        resp.raise_for_status()
        return {"ok": True, "device_id": device_id, "action": "contain"}

    def lift_containment(self, device_id: str) -> dict:
        """Lift containment from a host."""
        resp = _get_http_client().post(
            "/devices/entities/devices-actions/v2",
            headers=self._headers(),
            params={"action_name": "lift_containment"},
            json={"ids": [device_id]},
        )
        resp.raise_for_status()
        return {"ok": True, "device_id": device_id, "action": "lift_containment"}


# Module-level singleton — OAuth2 token and response cache persist across requests
cs_client = CrowdStrikeClient()
