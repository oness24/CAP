"""
Zabbix JSON-RPC API client.

Performance notes:
- Persistent httpx.Client per ZabbixClient instance (one TCP/TLS handshake,
  connection kept alive across all JSON-RPC calls).
- Module-level TTL cache (60 s) for the dashboard payload — subsequent page
  loads return instantly without hitting the Zabbix API.
- Dashboard API calls are parallelised via ThreadPoolExecutor so the 4 heavy
  queries (triggers, problems, subgroups, problems-last-hour) all run at once
  instead of sequentially.

Authentication: API token in the JSON `auth` field (Zabbix 6.0 style).
Group filtering: all queries are optionally scoped to a single host group
  (resolved by name at construction time).
"""
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from threading import Lock
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
#  Severity mappings                                                           #
# --------------------------------------------------------------------------- #
_SEVERITY_NAME: dict[int, str] = {
    0: "Not classified",
    1: "Information",
    2: "Warning",
    3: "Average",
    4: "High",
    5: "Disaster",
}

_SEVERITY_COLOR: dict[str, str] = {
    "Disaster":       "#7C3AED",
    "High":           "#EF4444",
    "Average":        "#F97316",
    "Warning":        "#EAB308",
    "Information":    "#3B82F6",
    "Not classified": "#6B7280",
}

_SEVERITY_ORDER = [5, 4, 3, 2, 1]

_UNREACHABLE_KWS = ("unavailable", "unreachable", "ping")

# --------------------------------------------------------------------------- #
#  Module-level TTL cache                                                      #
# --------------------------------------------------------------------------- #
_CACHE_TTL = 60  # seconds
_dashboard_cache: dict | None = None
_dashboard_cache_at: float = 0.0
_dashboard_cache_lock = Lock()


# --------------------------------------------------------------------------- #
#  Client                                                                      #
# --------------------------------------------------------------------------- #
class ZabbixClient:
    def __init__(self, base_url: str, api_token: str, group_name: str = "") -> None:
        self.api_url    = base_url.rstrip("/") + "/api_jsonrpc.php"
        self._token     = api_token
        self._req_id    = 0
        self._id_lock   = threading.Lock()
        self._group_ids: list[str] = []  # empty = no filter
        self._group_names: dict[str, str] = {}  # groupid -> group name
        self._group_name = group_name.split("#", 1)[0].strip()
        self._scope_required = bool(self._group_name)
        self._scope_ready = not self._scope_required

        # Persistent connection pool — reuses TLS sessions across all API calls
        self._http = httpx.Client(
            timeout=httpx.Timeout(30.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            verify=True,
        )

        if self._scope_required:
            # Resolve group lazily on first use instead of blocking startup
            self._group_resolved = False
        else:
            self._group_resolved = True

    def _ensure_group_resolved(self) -> None:
        """Resolve group IDs on first use (lazy init)."""
        if self._group_resolved:
            return
        self._group_resolved = True
        try:
            self._group_ids = self._resolve_group(self._group_name)
            if self._group_ids:
                self._scope_ready = True
                logger.info(
                    "Zabbix scoped to %d groups with prefix '%s' (ids=%s)",
                    len(self._group_ids), self._group_name, self._group_ids,
                )
            else:
                logger.error(
                    "Zabbix scope group '%s' not found — failing closed (no unscoped data will be returned)",
                    self._group_name,
                )
        except Exception as exc:
            logger.warning("Zabbix group resolution failed: %s", exc)

    def close(self) -> None:
        self._http.close()

    # ------------------------------------------------------------------ #
    #  Low-level JSON-RPC                                                  #
    # ------------------------------------------------------------------ #
    def _call(self, method: str, params: dict[str, Any]) -> Any:
        with self._id_lock:
            self._req_id += 1
            req_id = self._req_id

        payload = {
            "jsonrpc": "2.0",
            "method":  method,
            "params":  params,
            "auth":    self._token,
            "id":      req_id,
        }
        resp = self._http.post(
            self.api_url,
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        body = resp.json()
        if "error" in body:
            raise RuntimeError(f"Zabbix API error [{method}]: {body['error']}")
        return body["result"]

    def _group_filter(self) -> dict:
        """Return groupids kwarg when a group filter is active."""
        return {"groupids": self._group_ids} if self._group_ids else {}

    def _scope_unavailable(self) -> bool:
        self._ensure_group_resolved()
        return self._scope_required and not self._scope_ready

    def is_scope_unavailable(self) -> bool:
        return self._scope_unavailable()

    def _scoped_host_ids(self) -> list[str]:
        if self._scope_unavailable():
            return []
        if not self._scope_required:
            return []
        hosts = self._call("host.get", {
            "monitored_hosts": 1,
            "output": ["hostid"],
            **self._group_filter(),
        })
        return [h["hostid"] for h in hosts if "hostid" in h]

    def _empty_payload(self, mock_fallback: dict) -> dict:
        return {
            "_live": False,
            "kpis": {
                "totalHosts":      {"value": 0,     "trend": 0, "label": "Total Hosts"},
                "hostsUp":         {"value": 0,     "trend": 0, "label": "Hosts Up"},
                "hostsDown":       {"value": 0,     "trend": 0, "label": "Hosts Down"},
                "hostsDisabled":   {"value": 0,     "trend": 0, "label": "Hosts Disabled"},
                "activeTriggers":  {"value": 0,     "trend": 0, "label": "Active Triggers"},
                "problems1h":      {"value": 0,     "trend": 0, "label": "Problems (1h)"},
                "avgAvailability": {"value": "0.00%", "trend": 0, "label": "Avg Availability"},
            },
            "availabilityTrend":  [],
            "networkThroughput":  mock_fallback.get("networkThroughput", []),
            "triggersBySeverity": [],
            "hostGroupStatus":    [],
            "activeProblems":     [],
        }

    # ------------------------------------------------------------------ #
    #  Group resolution                                                    #
    # ------------------------------------------------------------------ #
    def _resolve_group(self, name: str) -> list[str]:
        """Look up all host groups whose name starts with *name*.

        For example, name='CAP' matches: CAP, CAP-APs, CAP-Catracas e Barreiras,
        CAP-Impressoras, CAP-switches, CAP/Hypervisor, CAP/LINKS, CAP/Linux,
        CAP/Network Assets, CAP/SedeAdm, CAP/Websites, CAP/Windows, etc.
        """
        try:
            groups = self._call("hostgroup.get", {
                "output": ["groupid", "name"],
                "search": {"name": name},
                "startSearch": True,
            })
            self._group_names = {g["groupid"]: g["name"] for g in groups}
            logger.info(
                "Resolved %d Zabbix groups for prefix '%s': %s",
                len(groups), name,
                ", ".join(f"{g['name']}(id={g['groupid']})" for g in groups),
            )
            return [g["groupid"] for g in groups]
        except Exception as exc:
            logger.warning("Could not resolve Zabbix group '%s': %s", name, exc)
            return []

    # ------------------------------------------------------------------ #
    #  Domain queries (all scoped to self._group_ids when set)            #
    # ------------------------------------------------------------------ #
    def get_hosts(self, monitored_only: bool = False) -> list[dict]:
        if self._scope_unavailable():
            return []
        params: dict[str, Any] = {
            "output": ["hostid", "host", "name", "status"],
            **self._group_filter(),
        }
        if monitored_only:
            params["monitored_hosts"] = 1
        return self._call("host.get", params)

    def get_host_subgroups(self, host_ids: list[str] | None = None) -> list[dict]:
        """
        Return groups that contain hosts from the scoped group.
        Accepts pre-fetched host_ids to avoid a redundant host.get call
        when called from fetch_dashboard (which already fetched hosts).
        """
        params: dict[str, Any] = {
            "output": ["groupid", "name"],
            "monitored_hosts": 1,
            "with_monitored_hosts": 1,
            "selectHosts": ["hostid"],
        }
        if self._group_ids:
            if host_ids is None:
                hosts = self.get_hosts()
                host_ids = [h["hostid"] for h in hosts]
            if not host_ids:
                return []
            params["hostids"] = host_ids
            params["filter"] = {}  # no name filter — get all matching groups

        groups = self._call("hostgroup.get", params)

        # Keep only groups that belong to the CAP scope (prefix-matched groups)
        scoped = set(self._group_ids)
        # Exclude the root group (exact match on the prefix name, e.g. "CAP")
        root_ids = {gid for gid, gname in self._group_names.items() if gname == self._group_name}
        return [g for g in groups if g["groupid"] in scoped and g["groupid"] not in root_ids]

    def get_active_triggers(self) -> list[dict]:
        if self._scope_unavailable():
            return []
        params: dict[str, Any] = {
            "only_true": 1,
            "monitored": 1,
            "active": 1,
            "output": ["triggerid", "description", "priority", "lastchange"],
            "selectHosts": ["hostid", "host"],
            "sortfield": "priority",
            "sortorder": "DESC",
            "limit": 500,
        }
        if self._scope_required:
            host_ids = self._scoped_host_ids()
            if not host_ids:
                return []
            params["hostids"] = host_ids
        else:
            params.update(self._group_filter())
        return self._call("trigger.get", params)

    def get_active_problems(self, limit: int = 50) -> list[dict]:
        if self._scope_unavailable():
            return []
        params: dict[str, Any] = {
            "output": ["eventid", "objectid", "name", "severity", "clock"],
            "suppressed": False,
            "sortfield": ["eventid"],
            "sortorder": "DESC",
            "limit": limit,
        }
        if self._scope_required:
            host_ids = self._scoped_host_ids()
            if not host_ids:
                return []
            params["hostids"] = host_ids
        else:
            params.update(self._group_filter())
        return self._call("problem.get", params)

    def get_problems_in_last_hour(self) -> int:
        if self._scope_unavailable():
            return 0
        one_hour_ago = int((datetime.now() - timedelta(hours=1)).timestamp())
        params: dict[str, Any] = {
            "output": ["eventid"],
            "time_from": one_hour_ago,
        }
        if self._scope_required:
            host_ids = self._scoped_host_ids()
            if not host_ids:
                return 0
            params["hostids"] = host_ids
        else:
            params.update(self._group_filter())
        problems = self._call("problem.get", params)
        return len(problems)

    def get_triggers_page(self, page: int = 1, limit: int = 50, severity: str = "") -> dict:
        """Paginated active triggers, optionally filtered by severity name."""
        if self._scope_unavailable():
            return {"total": 0, "page": page, "limit": limit, "items": []}
        params: dict[str, Any] = {
            "only_true": 1,
            "monitored": 1,
            "active": 1,
            "output": ["triggerid", "description", "priority", "lastchange", "value"],
            "selectHosts": ["hostid", "host", "name"],
            "sortfield": "priority",
            "sortorder": "DESC",
        }
        if self._scope_required:
            host_ids = self._scoped_host_ids()
            if not host_ids:
                return {"total": 0, "page": page, "limit": limit, "items": []}
            params["hostids"] = host_ids
        else:
            params.update(self._group_filter())
        triggers = self._call("trigger.get", params)

        # Filter by severity name if requested
        if severity:
            sev_num = next((k for k, v in _SEVERITY_NAME.items() if v.lower() == severity.lower()), None)
            if sev_num is not None:
                triggers = [t for t in triggers if int(t.get("priority", 0)) == sev_num]

        total = len(triggers)
        start = (page - 1) * limit
        page_items = triggers[start : start + limit]

        items = []
        for t in page_items:
            sev_num  = int(t.get("priority", 0))
            sev_name = _SEVERITY_NAME.get(sev_num, "Unknown")
            hosts    = t.get("hosts", [])
            ts       = int(t.get("lastchange", 0))
            elapsed  = max(0, int(time.time()) - ts)
            hrs, rem = divmod(elapsed, 3600)
            mins     = rem // 60
            items.append({
                "id":          t.get("triggerid", ""),
                "description": t.get("description", ""),
                "host":        hosts[0].get("host", "unknown") if hosts else "unknown",
                "host_name":   hosts[0].get("name", "") if hosts else "",
                "severity":    sev_name,
                "priority":    sev_num,
                "lastchange":  datetime.fromtimestamp(ts).strftime("%b %d, %H:%M") if ts else "—",
                "duration":    f"{hrs}h {mins}m",
            })
        return {"total": total, "page": page, "limit": limit, "items": items}

    def get_hosts_page(self, page: int = 1, limit: int = 50, search: str = "") -> dict:
        """Paginated hosts with availability status derived from triggers."""
        if self._scope_unavailable():
            return {"total": 0, "page": page, "limit": limit, "items": []}
        params: dict[str, Any] = {
            "output": ["hostid", "host", "name", "status"],
            "selectInterfaces": ["ip", "type"],
            "selectGroups": ["groupid", "name"],
            **self._group_filter(),
        }
        if search:
            params["search"] = {"host": search, "name": search}
            params["searchByAny"] = True

        hosts = self._call("host.get", params)
        total = len(hosts)

        # Determine down hosts from active unreachable triggers
        # Only check monitored hosts (status==0) for trigger-based availability
        monitored_ids = [h.get("hostid", "") for h in hosts if h.get("status") == "0"]
        try:
            trigger_params: dict[str, Any] = {
                "only_true": 1, "monitored": 1, "active": 1,
                "output": ["triggerid", "description", "priority"],
                "selectHosts": ["hostid"],
            }
            if self._scope_required:
                if monitored_ids:
                    trigger_params["hostids"] = monitored_ids
                else:
                    down_ids: set[str] = set()
                    # skip trigger query if no monitored hosts
            else:
                trigger_params.update(self._group_filter())

            if monitored_ids:
                triggers = self._call("trigger.get", trigger_params)
                down_ids = set()
                for t in triggers:
                    if any(kw in t.get("description", "").lower() for kw in _UNREACHABLE_KWS):
                        for h in t.get("hosts", []):
                            down_ids.add(h["hostid"])
            else:
                down_ids = set()
        except Exception:
            down_ids = set()

        start = (page - 1) * limit
        page_items = hosts[start : start + limit]

        items = []
        for h in page_items:
            hid    = h.get("hostid", "")
            ifaces = h.get("interfaces", [])
            ip     = ifaces[0].get("ip", "") if ifaces else ""
            groups = [g["name"] for g in h.get("groups", [])]
            # Zabbix host status: 0=monitored, 1=disabled
            if h.get("status") == "1":
                host_status = "Disabled"
            elif hid in down_ids:
                host_status = "Down"
            else:
                host_status = "Up"
            items.append({
                "id":     hid,
                "host":   h.get("host", ""),
                "name":   h.get("name", ""),
                "status": host_status,
                "ip":     ip,
                "groups": groups,
            })
        return {"total": total, "page": page, "limit": limit, "items": items}

    # ------------------------------------------------------------------ #
    #  Dashboard assembly                                                  #
    # ------------------------------------------------------------------ #
    def fetch_dashboard(self, mock_fallback: dict) -> dict:
        """
        Fetch live Zabbix data scoped to the configured group.

        - Returns cached result if the cache is less than _CACHE_TTL seconds old.
        - Parallelises the 4 heavy API calls after the initial host.get.
        - Falls back to stale cache or mock data on any API failure.
        """
        global _dashboard_cache, _dashboard_cache_at

        if self._scope_unavailable():
            logger.error("Zabbix scope is not available for group '%s' — refusing unscoped fetch", self._group_name)
            return _dashboard_cache if _dashboard_cache else self._empty_payload(mock_fallback)

        # Serve from cache if fresh
        with _dashboard_cache_lock:
            if _dashboard_cache is not None and (time.time() - _dashboard_cache_at) < _CACHE_TTL:
                return _dashboard_cache

        try:
            # Step 1 — ALL hosts (including disabled) for the total count
            all_hosts = self.get_hosts(monitored_only=False)
            all_host_ids = [h["hostid"] for h in all_hosts]
            # Monitored hosts only (status="0") — for trigger/availability analysis
            monitored_hosts = [h for h in all_hosts if h.get("status") == "0"]
            monitored_ids   = [h["hostid"] for h in monitored_hosts]
            disabled_hosts  = [h for h in all_hosts if h.get("status") == "1"]

            # Step 2 — 4 independent calls in parallel
            with ThreadPoolExecutor(max_workers=4) as ex:
                f_triggers    = ex.submit(self.get_active_triggers)
                f_problems    = ex.submit(self.get_active_problems, 50)
                f_subgroups   = ex.submit(self.get_host_subgroups, all_host_ids)
                f_problems_1h = ex.submit(self.get_problems_in_last_hour)

                triggers    = f_triggers.result()
                problems    = f_problems.result()
                subgroups   = f_subgroups.result()
                problems_1h = f_problems_1h.result()

        except Exception as exc:
            logger.warning("Zabbix API fetch failed — using %s: %s",
                           "stale cache" if _dashboard_cache else "empty payload", exc)
            return _dashboard_cache if _dashboard_cache else self._empty_payload(mock_fallback)

        # ── Host counts ──────────────────────────────────────────────── #
        # Zabbix 6.0: availability is per-interface, not on the host obj.
        # Derive "down" hosts from unreachable/ping triggers.
        total_hosts     = len(all_hosts)       # ALL hosts (monitored + disabled)
        total_monitored = len(monitored_hosts)  # Only actively monitored
        total_disabled  = len(disabled_hosts)

        down_host_ids: set[str] = set()
        for t in triggers:
            desc_lower = t.get("description", "").lower()
            if any(kw in desc_lower for kw in _UNREACHABLE_KWS):
                for th in t.get("hosts", []):
                    down_host_ids.add(th["hostid"])

        hosts_down = len(down_host_ids)
        hosts_up   = total_monitored - hosts_down
        avg_avail  = (hosts_up / total_monitored * 100) if total_monitored else 100.0

        # ── Trigger severity breakdown ───────────────────────────────── #
        sev_counts: dict[int, int] = {s: 0 for s in range(6)}
        for t in triggers:
            sev = int(t.get("priority", 0))
            sev_counts[sev] = sev_counts.get(sev, 0) + 1

        triggers_by_severity = [
            {
                "name":  _SEVERITY_NAME[sev],
                "value": sev_counts[sev],
                "color": _SEVERITY_COLOR[_SEVERITY_NAME[sev]],
            }
            for sev in _SEVERITY_ORDER
            if sev_counts.get(sev, 0) > 0
        ]
        if not triggers_by_severity:
            triggers_by_severity = mock_fallback.get("triggersBySeverity", [])

        # ── Host group status (sub-groups of CAP, top 12) ─────────────── #
        cap_host_ids = {h["hostid"] for h in all_hosts}

        host_group_status: list[dict] = []
        for g in subgroups[:12]:
            g_host_ids = {h["hostid"] for h in g.get("hosts", [])}
            # Only count hosts that belong to the scoped group
            scoped_ids = g_host_ids & cap_host_ids
            g_total    = len(scoped_ids)
            g_down     = len(scoped_ids & down_host_ids)
            g_up       = g_total - g_down
            g_avail    = (g_up / g_total * 100) if g_total else 100.0
            host_group_status.append({
                "group":        g["name"],
                "total":        g_total,
                "up":           g_up,
                "down":         g_down,
                "availability": f"{g_avail:.2f}%",
            })
        if not host_group_status:
            host_group_status = mock_fallback.get("hostGroupStatus", [])

        # ── Active problems list ─────────────────────────────────────── #
        trigger_map: dict[str, dict] = {t["triggerid"]: t for t in triggers}

        # Some problems reference triggers not in the main trigger list
        # (e.g. recently-cleared triggers). Fetch those on demand.
        missing_ids = [
            p["objectid"] for p in problems[:10]
            if p.get("objectid") and p["objectid"] not in trigger_map
        ]
        if missing_ids:
            try:
                extra = self._call("trigger.get", {
                    "triggerids": missing_ids,
                    "output": ["triggerid", "description", "priority"],
                    "selectHosts": ["hostid", "host"],
                    **self._group_filter(),
                })
                for t in extra:
                    trigger_map[t["triggerid"]] = t
            except Exception:
                pass  # best-effort; host name stays blank

        active_problems: list[dict] = []
        for p in problems[:10]:
            trigger   = trigger_map.get(p.get("objectid", ""), {})
            sev_num   = int(p.get("severity", 0))
            sev_name  = _SEVERITY_NAME.get(sev_num, "Unknown")
            host_list = trigger.get("hosts", [])
            host_name = host_list[0].get("host", "unknown") if host_list else "unknown"

            clock        = int(p.get("clock", time.time()))
            elapsed_secs = max(0, int(time.time()) - clock)
            hrs, rem     = divmod(elapsed_secs, 3600)
            mins         = rem // 60
            age_dt       = datetime.fromtimestamp(clock)

            active_problems.append({
                "id":       f"PROB-{p.get('eventid', 'N/A')}",
                "host":     host_name,
                "problem":  trigger.get("description") or p.get("name", "Unknown problem"),
                "severity": sev_name,
                "duration": f"{hrs}h {mins}m",
                "group":    "",
                "age":      age_dt.strftime("%b %d, %H:%M"),
            })

        if not active_problems:
            active_problems = mock_fallback.get("activeProblems", [])

        result = {
            "_live": True,
            "kpis": {
                "totalHosts":      {"value": total_hosts,         "trend": 0, "label": "Total Hosts"},
                "hostsUp":         {"value": hosts_up,            "trend": 0, "label": "Hosts Up"},
                "hostsDown":       {"value": hosts_down,          "trend": 0, "label": "Hosts Down"},
                "hostsDisabled":   {"value": total_disabled,      "trend": 0, "label": "Hosts Disabled"},
                "activeTriggers":  {"value": len(triggers),       "trend": 0, "label": "Active Triggers"},
                "problems1h":      {"value": problems_1h,         "trend": 0, "label": "Problems (1h)"},
                "avgAvailability": {"value": f"{avg_avail:.2f}%", "trend": 0, "label": "Avg Availability"},
            },
            # Time-series: use mock (requires known itemids for history queries)
            "availabilityTrend":  mock_fallback.get("availabilityTrend", []),
            "networkThroughput":  mock_fallback.get("networkThroughput", []),
            "triggersBySeverity": triggers_by_severity,
            "hostGroupStatus":    host_group_status,
            "activeProblems":     active_problems,
        }

        # Store in cache
        with _dashboard_cache_lock:
            _dashboard_cache    = result
            _dashboard_cache_at = time.time()

        return result


# --------------------------------------------------------------------------- #
#  Singleton — built once at import time                                       #
# --------------------------------------------------------------------------- #
def _make_client() -> ZabbixClient | None:
    from app.config import settings
    if settings.zabbix_url and settings.zabbix_api_token:
        return ZabbixClient(
            settings.zabbix_url,
            settings.zabbix_api_token,
            group_name=settings.zabbix_group,
        )
    return None


zabbix_client: ZabbixClient | None = _make_client()
