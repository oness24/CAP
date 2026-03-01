"""
Wazuh SIEM integration client.

Queries CAP-specific alert data via the Wazuh/OpenSearch Dashboard internal
search API and retrieves agent information from the Wazuh Manager API.

Data flow:
  1. Basic Auth + osd-xsrf header  → session cookie
  2. POST /api/login                → wz-token cookie (Manager JWT)
  3. POST /internal/search/opensearch → OpenSearch aggregation queries
  4. POST /api/request              → Wazuh Manager API proxy (agents, etc.)

Index pattern: ``wazuh-alerts-cap_*``  (pre-partitioned for the CAP client)
Time field:    ``timestamp``
Fields are Graylog-flattened (underscores, not dots):
    agent_id, agent_name, agent_ip, rule_id, rule_level, rule_description,
    rule_groups, client_group, location, decoder_name, manager_name …

Alert-level mapping (Wazuh convention):
    0-4  → Low   |  5-7  → Medium  |  8-11 → High  |  12+  → Critical
"""

import logging
import time
from datetime import datetime, timezone
from threading import Lock
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────────── #
#  Constants                                                                 #
# ────────────────────────────────────────────────────────────────────────── #
_CACHE_TTL = 120  # seconds — dashboard payload cache
_AGENT_CACHE_TTL = 300  # seconds — agent list cache

_LEVEL_LABEL: dict[str, str] = {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
    "critical": "Critical",
}


def _level_bucket(level: int) -> str:
    if level <= 4:
        return "Low"
    if level <= 7:
        return "Medium"
    if level <= 11:
        return "High"
    return "Critical"


# ────────────────────────────────────────────────────────────────────────── #
#  Client                                                                    #
# ────────────────────────────────────────────────────────────────────────── #
class WazuhClient:
    """Stateful Wazuh Dashboard / OpenSearch client."""

    def __init__(
        self,
        dashboard_url: str,
        username: str,
        password: str,
        api_id: str = "default",
        group: str = "CAP",
    ) -> None:
        self._base = dashboard_url.rstrip("/")
        self._auth = (username, password)
        self._api_id = api_id
        self._group = group.lower()
        self._index = f"wazuh-alerts-{self._group}_*"

        self._http = httpx.Client(
            timeout=httpx.Timeout(60.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            verify=False,  # self-signed cert
        )
        self._headers = {"osd-xsrf": "true", "Content-Type": "application/json"}

        # Caches
        self._dashboard_cache: dict | None = None
        self._dashboard_cache_at: float = 0.0
        self._dashboard_lock = Lock()

        self._agent_cache: list[dict] | None = None
        self._agent_cache_at: float = 0.0
        self._agent_lock = Lock()

    def close(self) -> None:
        self._http.close()

    # ── Low-level helpers ─────────────────────────────────────────────── #

    def _opensearch_query(self, body: dict) -> dict:
        """POST to /internal/search/opensearch."""
        payload = {"params": {"index": self._index, "body": body}}
        resp = self._http.post(
            f"{self._base}/internal/search/opensearch",
            json=payload,
            auth=self._auth,
            headers=self._headers,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("rawResponse", data)

    def _manager_login(self) -> None:
        """Authenticate with the Wazuh plugin to get the wz-token cookie."""
        self._http.post(
            f"{self._base}/api/login",
            json={"idHost": self._api_id, "force": False},
            auth=self._auth,
            headers=self._headers,
        )

    def _manager_request(self, method: str, path: str) -> dict:
        """Proxy a request to the Wazuh Manager API via the plugin."""
        self._manager_login()
        resp = self._http.post(
            f"{self._base}/api/request",
            json={"method": method, "path": path, "body": {}, "id": self._api_id},
            auth=self._auth,
            headers=self._headers,
        )
        resp.raise_for_status()
        return resp.json()

    # ── Agent helpers ─────────────────────────────────────────────────── #

    def _fetch_agents(self) -> list[dict]:
        """Get CAP agents from the Manager API (cached)."""
        with self._agent_lock:
            if self._agent_cache is not None and (time.time() - self._agent_cache_at) < _AGENT_CACHE_TTL:
                return self._agent_cache

        try:
            group_upper = self._group.upper()
            data = self._manager_request(
                "GET",
                f"/agents?limit=500&q=group={group_upper}"
                f"&select=id,name,ip,status,os.name,os.version,group,lastKeepAlive",
            )
            items = data.get("data", {}).get("affected_items", [])
            with self._agent_lock:
                self._agent_cache = items
                self._agent_cache_at = time.time()
            return items
        except Exception as exc:
            logger.warning("Wazuh agent fetch failed: %s", exc)
            with self._agent_lock:
                return self._agent_cache or []

    # ── OpenSearch aggregation helpers ────────────────────────────────── #

    def _alert_count(self, gte: str = "now-24h") -> int:
        """Count alerts in a time range."""
        body: dict[str, Any] = {
            "size": 0,
            "query": {"range": {"timestamp": {"gte": gte}}},
        }
        raw = self._opensearch_query(body)
        total = raw.get("hits", {}).get("total", 0)
        return total if isinstance(total, int) else total.get("value", 0)

    def _alert_aggregations(self) -> dict:
        """Run all dashboard aggregations in one request."""
        body: dict[str, Any] = {
            "size": 0,
            "query": {"match_all": {}},
            "aggs": {
                "alerts_24h": {
                    "filter": {"range": {"timestamp": {"gte": "now-24h"}}},
                    "aggs": {
                        "by_level": {"terms": {"field": "rule_level", "size": 20}},
                    },
                },
                "alerts_7d": {
                    "filter": {"range": {"timestamp": {"gte": "now-7d"}}},
                },
                "alerts_30d": {
                    "filter": {"range": {"timestamp": {"gte": "now-30d"}}},
                },
                "alerts_90d": {
                    "filter": {"range": {"timestamp": {"gte": "now-90d"}}},
                },
                "alerts_365d": {
                    "filter": {"range": {"timestamp": {"gte": "now-365d"}}},
                },
                "level_dist": {
                    "terms": {"field": "rule_level", "size": 20},
                },
                "top_rules": {
                    "terms": {"field": "rule_description", "size": 10},
                },
                "top_rule_ids": {
                    "terms": {"field": "rule_id", "size": 10},
                },
                "hourly_trend": {
                    "filter": {"range": {"timestamp": {"gte": "now-24h"}}},
                    "aggs": {
                        "per_hour": {"date_histogram": {"field": "timestamp", "fixed_interval": "1h"}},
                    },
                },
                "daily_trend": {
                    "filter": {"range": {"timestamp": {"gte": "now-7d"}}},
                    "aggs": {
                        "per_day": {"date_histogram": {"field": "timestamp", "fixed_interval": "1d"}},
                    },
                },
                "monthly_trend": {
                    "filter": {"range": {"timestamp": {"gte": "now-90d"}}},
                    "aggs": {
                        "per_month": {"date_histogram": {"field": "timestamp", "calendar_interval": "1M"}},
                    },
                },
            },
        }
        return self._opensearch_query(body)

    def _recent_alerts(self, size: int = 20) -> list[dict]:
        """Fetch most recent alerts."""
        body: dict[str, Any] = {
            "size": size,
            "sort": [{"timestamp": {"order": "desc"}}],
            "query": {"match_all": {}},
            "_source": [
                "agent_id", "agent_name", "agent_ip",
                "rule_id", "rule_level", "rule_description", "rule_groups",
                "rule_gdpr", "rule_gpg13",
                "location", "decoder_name", "timestamp",
            ],
        }
        raw = self._opensearch_query(body)
        hits = raw.get("hits", {}).get("hits", [])
        alerts: list[dict] = []
        for h in hits:
            src = h.get("_source", {})
            level = int(src.get("rule_level", 0))
            alerts.append({
                "id": h.get("_id", ""),
                "rule": str(src.get("rule_id", "")),
                "description": src.get("rule_description", ""),
                "agent": src.get("agent_name", ""),
                "ip": src.get("agent_ip", ""),
                "level": _level_bucket(level),
                "ruleLevel": level,
                "groups": src.get("rule_groups", ""),
                "timestamp": src.get("timestamp", ""),
            })
        return alerts

    # ── Public: Dashboard payload ─────────────────────────────────────── #

    def fetch_dashboard(self, mock_fallback: dict) -> dict:
        """Return the full Wazuh dashboard dict (cached with TTL)."""
        with self._dashboard_lock:
            if self._dashboard_cache and (time.time() - self._dashboard_cache_at) < _CACHE_TTL:
                return self._dashboard_cache

        try:
            result = self._build_dashboard(mock_fallback)
            with self._dashboard_lock:
                self._dashboard_cache = result
                self._dashboard_cache_at = time.time()
            return result
        except Exception as exc:
            logger.exception("Wazuh dashboard build failed: %s", exc)
            if self._dashboard_cache:
                return self._dashboard_cache
            return mock_fallback

    def _build_dashboard(self, mock_fallback: dict) -> dict:
        """Build dashboard payload from live data."""
        aggs = self._alert_aggregations()
        aggregations = aggs.get("aggregations", {})
        total_all = aggs.get("hits", {}).get("total", 0)
        if isinstance(total_all, dict):
            total_all = total_all.get("value", 0)

        # ── Extract counts ────────────────────────────────────────────── #
        alerts_24h = aggregations.get("alerts_24h", {}).get("doc_count", 0)
        alerts_7d = aggregations.get("alerts_7d", {}).get("doc_count", 0)
        alerts_30d = aggregations.get("alerts_30d", {}).get("doc_count", 0)
        alerts_90d = aggregations.get("alerts_90d", {}).get("doc_count", 0)
        alerts_365d = aggregations.get("alerts_365d", {}).get("doc_count", 0)

        # ── Level distribution (24h) → severity buckets ───────────────── #
        level_24h_buckets = aggregations.get("alerts_24h", {}).get("by_level", {}).get("buckets", [])
        severity = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for b in level_24h_buckets:
            lbl = _level_bucket(b["key"])
            severity[lbl] += b["doc_count"]

        # ── Level distribution (all) ──────────────────────────────────── #
        level_all_buckets = aggregations.get("level_dist", {}).get("buckets", [])
        level_dist_all = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for b in level_all_buckets:
            lbl = _level_bucket(b["key"])
            level_dist_all[lbl] += b["doc_count"]

        # ── Top rules ─────────────────────────────────────────────────── #
        rule_desc_buckets = aggregations.get("top_rules", {}).get("buckets", [])
        rule_id_buckets = aggregations.get("top_rule_ids", {}).get("buckets", [])
        rule_id_map = {b["key"]: b["doc_count"] for b in rule_id_buckets}
        top_rules: list[dict] = []
        for b in rule_desc_buckets[:10]:
            top_rules.append({
                "ruleId": "",  # desc bucket doesn't carry ID; we match below
                "description": b["key"],
                "count": b["doc_count"],
            })
        # Try to match rule IDs to descriptions via position
        if len(rule_id_buckets) == len(rule_desc_buckets):
            for i, rb in enumerate(rule_id_buckets[:10]):
                if i < len(top_rules):
                    top_rules[i]["ruleId"] = rb["key"]

        # ── Hourly trend (24 h) ──────────────────────────────────────── #
        hourly_buckets = aggregations.get("hourly_trend", {}).get("per_hour", {}).get("buckets", [])
        alert_trend: list[dict] = []
        for b in hourly_buckets:
            ts_str = b.get("key_as_string", "")
            # e.g. "2026-03-01 14:00:00.000" → "14:00"
            short_label = ts_str[11:16] if len(ts_str) > 16 else ts_str
            alert_trend.append({"time": short_label, "value": b["doc_count"]})

        # ── Daily trend (7 d) ────────────────────────────────────────── #
        daily_buckets = aggregations.get("daily_trend", {}).get("per_day", {}).get("buckets", [])
        daily_trend: list[dict] = []
        for b in daily_buckets:
            ts_str = b.get("key_as_string", "")
            label = ts_str[:10] if len(ts_str) >= 10 else ts_str
            daily_trend.append({"time": label, "value": b["doc_count"]})

        # ── Monthly trend (90 d) ─────────────────────────────────────── #
        monthly_buckets = aggregations.get("monthly_trend", {}).get("per_month", {}).get("buckets", [])
        monthly_trend: list[dict] = []
        for b in monthly_buckets:
            ts_str = b.get("key_as_string", "")
            label = ts_str[:7] if len(ts_str) >= 7 else ts_str
            monthly_trend.append({"time": label, "value": b["doc_count"]})

        # ── Agent stats ──────────────────────────────────────────────── #
        agents = self._fetch_agents()
        total_agents = len(agents)
        active_agents = sum(1 for a in agents if a.get("status") == "active")
        disconnected = sum(1 for a in agents if a.get("status") == "disconnected")
        never_connected = sum(1 for a in agents if a.get("status") == "never_connected")

        # ── Recent alerts ────────────────────────────────────────────── #
        recent = self._recent_alerts(20)

        # ── Agents by OS ─────────────────────────────────────────────── #
        os_counts: dict[str, int] = {}
        for a in agents:
            os_name = a.get("os", {}).get("name", "Unknown")
            os_counts[os_name] = os_counts.get(os_name, 0) + 1
        agents_by_os = sorted(
            [{"os": k, "count": v} for k, v in os_counts.items()],
            key=lambda x: x["count"], reverse=True,
        )

        def _fmt(n: int) -> str:
            """Format large numbers with commas."""
            return f"{n:,}"

        return {
            "_live": True,
            "kpis": {
                "totalAgents":    {"value": total_agents,                        "trend": 0,  "label": "Total Agents"},
                "activeAlerts":   {"value": _fmt(alerts_24h),                    "trend": 0,  "label": "Alerts (24h)"},
                "criticalEvents": {"value": _fmt(severity["Critical"] + severity["High"]),
                                   "trend": 0,  "label": "Critical+High (24h)"},
                "complianceScore": mock_fallback.get("kpis", {}).get("complianceScore",
                                   {"value": "N/A", "trend": 0, "label": "PCI-DSS Score"}),
                "agentsOnline":   {"value": f"{active_agents}/{total_agents}",   "trend": 0,  "label": "Agents Online"},
                "rulesTriggered": {"value": len(top_rules),                      "trend": 0,  "label": "Top Rules"},
            },
            "alertTrend": alert_trend,
            "dailyTrend": daily_trend,
            "monthlyTrend": monthly_trend,
            "topRules": top_rules,
            "complianceBreakdown": mock_fallback.get("complianceBreakdown", []),
            "agentsByOS": agents_by_os,
            "recentAlerts": recent,
            "alertVolume": {
                "24h":   alerts_24h,
                "7d":    alerts_7d,
                "30d":   alerts_30d,
                "90d":   alerts_90d,
                "365d":  alerts_365d,
                "total": total_all,
            },
            "severityBreakdown24h": [
                {"severity": k, "count": v} for k, v in severity.items()
            ],
            "severityBreakdownAll": [
                {"severity": k, "count": v} for k, v in level_dist_all.items()
            ],
            "agentSummary": {
                "total": total_agents,
                "active": active_agents,
                "disconnected": disconnected,
                "neverConnected": never_connected,
            },
        }

    # ── Public: Paged alerts ──────────────────────────────────────────── #

    def get_alerts_page(self, page: int, limit: int, severity: str = "", rule_id: str = "") -> dict:
        """Return a page of alerts (most recent first)."""
        must: list[dict] = []
        if severity:
            level_ranges = {
                "critical": {"gte": 12},
                "high":     {"gte": 8, "lt": 12},
                "medium":   {"gte": 5, "lt": 8},
                "low":      {"lt": 5},
            }
            rng = level_ranges.get(severity.lower())
            if rng:
                must.append({"range": {"rule_level": rng}})
        if rule_id:
            must.append({"term": {"rule_id": rule_id}})

        query: dict = {"bool": {"must": must}} if must else {"match_all": {}}
        offset = (page - 1) * limit

        body: dict[str, Any] = {
            "size": limit,
            "from": offset,
            "sort": [{"timestamp": {"order": "desc"}}],
            "query": query,
            "_source": [
                "agent_id", "agent_name", "agent_ip",
                "rule_id", "rule_level", "rule_description", "rule_groups",
                "location", "decoder_name", "timestamp",
            ],
        }
        raw = self._opensearch_query(body)
        total_raw = raw.get("hits", {}).get("total", 0)
        total = total_raw if isinstance(total_raw, int) else total_raw.get("value", 0)
        hits = raw.get("hits", {}).get("hits", [])

        items: list[dict] = []
        for h in hits:
            src = h.get("_source", {})
            level = int(src.get("rule_level", 0))
            items.append({
                "id": h.get("_id", ""),
                "rule": str(src.get("rule_id", "")),
                "description": src.get("rule_description", ""),
                "agent": src.get("agent_name", ""),
                "ip": src.get("agent_ip", ""),
                "level": _level_bucket(level),
                "ruleLevel": level,
                "groups": src.get("rule_groups", ""),
                "timestamp": src.get("timestamp", ""),
            })

        return {
            "page": page,
            "limit": limit,
            "total": min(total, 10000),  # OS caps at 10000 for from+size
            "items": items,
        }

    # ── Public: Agents page ───────────────────────────────────────────── #

    def get_agents_page(self, page: int, limit: int, search: str = "") -> dict:
        agents = self._fetch_agents()
        if search:
            s = search.lower()
            agents = [a for a in agents if s in a.get("name", "").lower() or s in a.get("ip", "").lower()]

        total = len(agents)
        start = (page - 1) * limit
        page_items = agents[start: start + limit]

        items: list[dict] = []
        for a in page_items:
            items.append({
                "id": a.get("id", ""),
                "name": a.get("name", ""),
                "ip": a.get("ip", ""),
                "status": a.get("status", "unknown"),
                "os": a.get("os", {}).get("name", "Unknown"),
                "osVersion": a.get("os", {}).get("version", ""),
                "group": ", ".join(a.get("group", [])),
                "lastKeepAlive": a.get("lastKeepAlive", ""),
            })
        return {
            "page": page,
            "limit": limit,
            "total": total,
            "items": items,
        }

    # ── Public: Alert volume summary ──────────────────────────────────── #

    def get_alert_volume(self) -> dict:
        """Dedicated endpoint: alert counts per period."""
        body: dict[str, Any] = {
            "size": 0,
            "query": {"match_all": {}},
            "aggs": {
                "24h":  {"filter": {"range": {"timestamp": {"gte": "now-24h"}}}},
                "7d":   {"filter": {"range": {"timestamp": {"gte": "now-7d"}}}},
                "30d":  {"filter": {"range": {"timestamp": {"gte": "now-30d"}}}},
                "90d":  {"filter": {"range": {"timestamp": {"gte": "now-90d"}}}},
                "365d": {"filter": {"range": {"timestamp": {"gte": "now-365d"}}}},
            },
        }
        raw = self._opensearch_query(body)
        total_raw = raw.get("hits", {}).get("total", 0)
        total = total_raw if isinstance(total_raw, int) else total_raw.get("value", 0)
        aggs = raw.get("aggregations", {})
        return {
            "24h":   aggs.get("24h", {}).get("doc_count", 0),
            "7d":    aggs.get("7d", {}).get("doc_count", 0),
            "30d":   aggs.get("30d", {}).get("doc_count", 0),
            "90d":   aggs.get("90d", {}).get("doc_count", 0),
            "365d":  aggs.get("365d", {}).get("doc_count", 0),
            "total": total,
        }


# ────────────────────────────────────────────────────────────────────────── #
#  Module-level singleton                                                    #
# ────────────────────────────────────────────────────────────────────────── #
wazuh_client: WazuhClient | None = None

if settings.wazuh_dashboard_url and settings.wazuh_username:
    try:
        wazuh_client = WazuhClient(
            dashboard_url=settings.wazuh_dashboard_url,
            username=settings.wazuh_username,
            password=settings.wazuh_password,
            api_id=settings.wazuh_api_id,
            group=settings.wazuh_group,
        )
        logger.info("Wazuh client created for %s (group=%s)", settings.wazuh_dashboard_url, settings.wazuh_group)
    except Exception as exc:
        logger.warning("Failed to create Wazuh client: %s", exc)
else:
    logger.info("Wazuh integration not configured (WAZUH_DASHBOARD_URL empty).")
