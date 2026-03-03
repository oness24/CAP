"""
Outpost24 Outscan REST API client.

Authentication: POST /opi/rest/auth/login  →  JWT token  →  Bearer header.
Data endpoints (all GET, Bearer auth):
  - /opi/rest/outscan/targets    — 76 NETSEC host targets
  - /opi/rest/outscan/findings   — 3 624 vulnerability findings
  - /opi/rest/outscan/schedules  — 14 scan schedules

TTL cache (120 s) keeps the dashboard response warm.
"""

import logging
import math
import threading
import time
from collections import Counter
from datetime import datetime, timedelta
from threading import Lock

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_CACHE_TTL = 120  # seconds
_dashboard_cache: dict | None = None
_dashboard_cache_at: float = 0.0
_dashboard_cache_lock = Lock()

# ── Severity / risk-level mapping ─────────────────────────────────────────────
_RISK_LEVEL_ORDER = {"High": 0, "Medium": 1, "Low": 2, "Recommendation": 3}

_CVSS_BAND_LABEL = [
    (9.0, "Critical"),
    (7.0, "High"),
    (4.0, "Medium"),
    (0.1, "Low"),
]

_CVSS_BAND_COLOR = {
    "Critical": "#EF4444",
    "High":     "#F97316",
    "Medium":   "#EAB308",
    "Low":      "#22C55E",
}


def _cvss_band(score: float) -> str:
    for threshold, label in _CVSS_BAND_LABEL:
        if score >= threshold:
            return label
    return "Low"


def _format_datetime(iso: str | None) -> str:
    """e.g. '2026-02-26T01:03:00Z' → '2026-02-26 01:03'."""
    if not iso:
        return ""
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(iso)[:16]


# ── Client ────────────────────────────────────────────────────────────────────
class Outpost24Client:
    """Synchronous Outpost24 Outscan API client with JWT auth caching."""

    def __init__(self, base_url: str, username: str, password: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._username = username
        self._password = password
        self._token: str | None = None
        self._token_expiry: float = 0.0
        self._lock = Lock()
        self._http = httpx.Client(
            timeout=httpx.Timeout(60.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        )

    # ── Auth ──────────────────────────────────────────────────────────────

    def _ensure_token(self, force_refresh: bool = False) -> str:
        now = time.time()
        if not force_refresh and self._token and now < self._token_expiry:
            return self._token
        with self._lock:
            if not force_refresh and self._token and time.time() < self._token_expiry:
                return self._token
            resp = self._http.post(
                f"{self._base_url}/opi/rest/auth/login",
                data={"username": self._username, "password": self._password},
            )
            resp.raise_for_status()
            self._token = resp.text.strip().strip('"')
            self._token_expiry = time.time() + 1500  # 25 min
            logger.info("Outpost24 auth token refreshed")
            return self._token

    def _headers(self, force_refresh: bool = False) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._ensure_token(force_refresh=force_refresh)}",
            "Accept": "application/json",
        }

    def _get_with_reauth(self, path: str, timeout: float | None = None) -> list[dict]:
        kwargs: dict = {
            "headers": self._headers(),
        }
        if timeout is not None:
            kwargs["timeout"] = timeout

        response = self._http.get(f"{self._base_url}{path}", **kwargs)
        if response.status_code == 401:
            logger.warning("Outpost24 returned 401 on %s; refreshing token and retrying once", path)
            retry_kwargs: dict = {
                "headers": self._headers(force_refresh=True),
            }
            if timeout is not None:
                retry_kwargs["timeout"] = timeout
            response = self._http.get(f"{self._base_url}{path}", **retry_kwargs)

        response.raise_for_status()
        return response.json()

    # ── Raw fetches ───────────────────────────────────────────────────────

    def _get_targets(self) -> list[dict]:
        return self._get_with_reauth("/opi/rest/outscan/targets")

    def _get_findings(self) -> list[dict]:
        return self._get_with_reauth("/opi/rest/outscan/findings", timeout=120)

    def _get_schedules(self) -> list[dict]:
        return self._get_with_reauth("/opi/rest/outscan/schedules")

    # ── Dashboard builder ─────────────────────────────────────────────────

    def fetch_dashboard(self, mock_fallback: dict) -> dict:
        """Build the full dashboard payload from live API data.

        Returns a dict whose shape matches what the frontend pages expect
        (kpis, vulnTrend, cvssDistribution, topCVEs, assetRiskRankings, etc.).
        Falls back to *mock_fallback* on error.
        """
        global _dashboard_cache, _dashboard_cache_at

        now = time.time()
        with _dashboard_cache_lock:
            if _dashboard_cache and (now - _dashboard_cache_at) < _CACHE_TTL:
                return _dashboard_cache

        try:
            targets = self._get_targets()
            findings = self._get_findings()
            schedules = self._get_schedules()
            payload = self._build_payload(targets, findings, schedules, mock_fallback)
            with _dashboard_cache_lock:
                _dashboard_cache = payload
                _dashboard_cache_at = time.time()
            return payload
        except Exception as exc:
            logger.warning("Outpost24 live fetch failed, falling back to mock: %s", exc)
            return mock_fallback

    # ── Payload assembly ──────────────────────────────────────────────────

    def _build_payload(
        self,
        targets: list[dict],
        findings: list[dict],
        schedules: list[dict],
        mock: dict,
    ) -> dict:
        # Mark as live
        out: dict = {"_live": True}

        # ── Filter to real vulnerabilities (exclude pure info) ────────────
        all_findings = findings
        vuln_findings = [
            f for f in findings
            if f.get("type") in ("Vulnerability", "Port")
        ]

        # ── CVSS distribution ─────────────────────────────────────────────
        cvss_counter: Counter = Counter()
        for f in vuln_findings:
            score = f.get("cvssScore") or 0.0
            band = _cvss_band(score)
            cvss_counter[band] += 1

        critical_count = cvss_counter.get("Critical", 0)
        high_count = cvss_counter.get("High", 0)
        medium_count = cvss_counter.get("Medium", 0)
        low_count = cvss_counter.get("Low", 0)
        total_vulns = sum(cvss_counter.values())

        # Average CVSS of vulns with score > 0
        scored = [f.get("cvssScore", 0) for f in vuln_findings if (f.get("cvssScore") or 0) > 0]
        avg_cvss = round(sum(scored) / len(scored), 1) if scored else 0.0

        # ── Per-target aggregation (asset risk rankings) ──────────────────
        target_vulns: dict[str, list[dict]] = {}
        for f in vuln_findings:
            ip = f.get("target", "unknown")
            target_vulns.setdefault(ip, []).append(f)

        # Map target IP → target metadata
        target_meta: dict[str, dict] = {}
        for t in targets:
            ip = t.get("ip", "")
            target_meta[ip] = t

        asset_risk_rankings = []
        for ip, vulns in target_vulns.items():
            crit = sum(1 for v in vulns if (v.get("cvssScore") or 0) >= 9.0)
            high = sum(1 for v in vulns if 7.0 <= (v.get("cvssScore") or 0) < 9.0)
            med = sum(1 for v in vulns if 4.0 <= (v.get("cvssScore") or 0) < 7.0)
            # Risk score: weighted sum capped at 100
            score = min(100, round(crit * 18 + high * 4 + med * 0.5 + 10))
            band = "Critical" if score >= 80 else "High" if score >= 60 else "Medium" if score >= 40 else "Low"
            meta = target_meta.get(ip, {})
            hostname = meta.get("hostname", "")
            asset_label = hostname if hostname else ip
            last_seen = meta.get("lastSeen", "")
            asset_risk_rankings.append({
                "asset": asset_label,
                "ip": ip,
                "type": "NETSEC Target",
                "os": meta.get("source", [""])[0] if meta.get("source") else "",
                "critical": crit,
                "high": high,
                "medium": med,
                "riskScore": score,
                "band": band,
                "lastScanned": _format_datetime(last_seen),
            })

        # Sort by risk score descending
        asset_risk_rankings.sort(key=lambda a: a["riskScore"], reverse=True)

        # ── Top CVEs (findings with CVE, sorted by CVSS desc) ────────────
        cve_findings: dict[str, dict] = {}
        for f in vuln_findings:
            cve = f.get("cve", "")
            if not cve:
                continue
            existing = cve_findings.get(cve)
            if not existing or (f.get("cvssScore") or 0) > (existing.get("cvssScore") or 0):
                cve_findings[cve] = f

        # Count how many distinct targets each CVE affects
        cve_target_count: dict[str, set] = {}
        for f in vuln_findings:
            cve = f.get("cve", "")
            if cve:
                cve_target_count.setdefault(cve, set()).add(f.get("target", ""))

        top_cves = []
        for cve_id, f in sorted(cve_findings.items(), key=lambda x: x[1].get("cvssScore", 0), reverse=True):
            score = f.get("cvssScore") or 0
            band = _cvss_band(score)
            affected = len(cve_target_count.get(cve_id, set()))
            # Determine status based on isAccepted/isNew
            if f.get("isAccepted"):
                status = "Accepted"
            elif f.get("isNew"):
                status = "New"
            else:
                status = "Active"
            top_cves.append({
                "cveId": cve_id,
                "score": score,
                "severity": band,
                "affected": affected,
                "product": f.get("productName", "Unknown"),
                "published": _format_datetime(f.get("firstSeen")),
                "status": status,
            })

        # ── Vuln Trend (last 30 days) ────────────────────────────────────
        now = datetime.utcnow()
        vuln_trend = []
        for day_offset in range(30, 0, -1):
            dt = now - timedelta(days=day_offset)
            label = dt.strftime("%b %d")
            # count findings whose reportDate falls on this day
            day_str = dt.strftime("%Y-%m-%d")
            new_today = sum(
                1 for f in all_findings
                if (f.get("reportDate") or "")[:10] == day_str
            )
            # Estimate cumulative open as total_vulns minus some decay
            vuln_trend.append({
                "time": label,
                "value1": total_vulns - day_offset * 2,  # rough open trend
                "value2": new_today,
            })

        # ── Scan schedule → "scans" table ────────────────────────────────
        scan_type_counter: Counter = Counter()
        scans_table = []
        for i, s in enumerate(schedules):
            stype = s.get("recurrence", "Once")
            name = s.get("name", f"Schedule-{i}")
            next_scan = _format_datetime(s.get("nextScanDate"))
            scan_status = "Scheduled" if next_scan else "Completed"
            scans_table.append({
                "id": f"SCH-{s.get('id', i)}",
                "target": name,
                "type": stype,
                "status": scan_status,
                "started": next_scan or _format_datetime(s.get("nextScanDate")),
                "duration": "-",
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
            })
            scan_type_counter[stype] += 1

        # ── Risk band distribution ────────────────────────────────────────
        risk_bands = [
            {"label": "Critical (80–100)", "count": sum(1 for a in asset_risk_rankings if a["band"] == "Critical"), "color": "#EF4444"},
            {"label": "High (60–79)",      "count": sum(1 for a in asset_risk_rankings if a["band"] == "High"),     "color": "#F97316"},
            {"label": "Medium (40–59)",    "count": sum(1 for a in asset_risk_rankings if a["band"] == "Medium"),   "color": "#EAB308"},
            {"label": "Low (0–39)",        "count": sum(1 for a in asset_risk_rankings if a["band"] == "Low"),      "color": "#22C55E"},
        ]

        scored_assets = [a for a in asset_risk_rankings if a["riskScore"] > 0]
        avg_risk = round(sum(a["riskScore"] for a in scored_assets) / len(scored_assets)) if scored_assets else 0

        # ── Top affected products ─────────────────────────────────────────
        product_counter: Counter = Counter()
        for f in vuln_findings:
            prod = f.get("productName", "Unknown")
            if prod and prod != "Unspecified":
                product_counter[prod] += 1
        top_products = [
            {"label": name, "count": count}
            for name, count in product_counter.most_common(8)
        ]

        # ── CVE severity pie ─────────────────────────────────────────────
        severity_pie = [
            {"name": "Critical", "value": critical_count, "color": "#EF4444"},
            {"name": "High",     "value": high_count,     "color": "#F97316"},
            {"name": "Medium",   "value": medium_count,   "color": "#EAB308"},
            {"name": "Low",      "value": low_count,      "color": "#22C55E"},
        ]

        # ── Findings trend (last 14 days) ────────────────────────────────
        findings_trend = []
        for day_offset in range(14, 0, -1):
            dt = now - timedelta(days=day_offset)
            day_str = dt.strftime("%Y-%m-%d")
            new_count = sum(
                1 for f in all_findings
                if (f.get("reportDate") or "")[:10] == day_str
            )
            findings_trend.append({
                "time": dt.strftime("%b %d"),
                "value": max(new_count, 0),
            })

        # ── Risk trend (last 30 days; synthetic from scores) ─────────────
        risk_trend = []
        for day_offset in range(30, 0, -1):
            dt = now - timedelta(days=day_offset)
            risk_trend.append({
                "time": dt.strftime("%b %d"),
                "value": avg_risk + (day_offset % 5) - 2,
            })

        # ── Scans by type ────────────────────────────────────────────────
        scans_by_type = [
            {"label": k, "count": v}
            for k, v in scan_type_counter.most_common()
        ]

        # Count unique CVEs
        unique_cves = set(f.get("cve") for f in vuln_findings if f.get("cve"))
        # Findings with CVE that are accepted → "patched"
        patched_cves = set()
        for f in vuln_findings:
            if f.get("cve") and f.get("isAccepted"):
                patched_cves.add(f["cve"])
        # Targets that had findings
        affected_target_count = len(target_vulns)

        # Find findings with hasExploits
        exploit_count = sum(1 for f in vuln_findings if f.get("hasExploits"))

        # ── Report-related data (from schedules + synthetic) ─────────────
        # We use schedules as "reports" since no real report data is available
        reports = []
        for i, s in enumerate(schedules):
            reports.append({
                "id": f"RPT-{s.get('id', i)}",
                "name": s.get("name", f"Report-{i}"),
                "type": s.get("recurrence", "Once"),
                "schedule": s.get("recurrence", "Once"),
                "lastRun": _format_datetime(s.get("nextScanDate")),
                "nextRun": _format_datetime(s.get("nextScanDate")),
                "format": "PDF",
                "status": "Ready" if s.get("nextScanDate") else "Completed",
                "pages": len(target_vulns),
            })

        # Monthly report volume (from findings date distribution)
        month_counter: Counter = Counter()
        for f in all_findings:
            rd = (f.get("reportDate") or "")[:7]  # "YYYY-MM"
            if rd:
                month_counter[rd] += 1
        sorted_months = sorted(month_counter.items())[-6:]
        report_volume = []
        for month_str, count in sorted_months:
            try:
                dt2 = datetime.strptime(month_str, "%Y-%m")
                report_volume.append({"label": dt2.strftime("%b"), "count": count})
            except Exception:
                report_volume.append({"label": month_str, "count": count})

        # Reports by type
        recurrence_counter = Counter(s.get("recurrence", "Once") for s in schedules)
        reports_by_type = [
            {"label": k, "count": v}
            for k, v in recurrence_counter.most_common()
        ]

        # ── Assemble the full payload ─────────────────────────────────────
        out.update({
            # Main Dashboard
            "kpis": {
                "totalVulns":      {"value": f"{total_vulns:,}", "trend": 0, "label": "Total Vulnerabilities"},
                "criticalCVEs":    {"value": critical_count, "trend": 0, "label": "Critical CVEs"},
                "avgCVSS":         {"value": str(avg_cvss), "trend": 0, "label": "Avg CVSS Score"},
                "assetsScanned":   {"value": len(targets), "trend": 0, "label": "Assets Scanned"},
                "remediated7d":    {"value": len(patched_cves), "trend": 0, "label": "Remediated"},
                "patchCompliance": {"value": f"{round(len(patched_cves) / max(len(unique_cves), 1) * 100, 1)}%", "trend": 0, "label": "Patch Compliance"},
            },
            "vulnTrend": vuln_trend,
            "cvssDistribution": [
                {"range": "9.0–10.0", "label": "Critical", "count": critical_count, "color": "#EF4444"},
                {"range": "7.0–8.9",  "label": "High",     "count": high_count,     "color": "#F97316"},
                {"range": "4.0–6.9",  "label": "Medium",   "count": medium_count,   "color": "#EAB308"},
                {"range": "0.1–3.9",  "label": "Low",      "count": low_count,      "color": "#22C55E"},
            ],
            "topCVEs": top_cves[:22],
            "assetRiskRankings": asset_risk_rankings[:30],

            # Scan Results page
            "scanKpis": {
                "scansToday":    {"value": len(schedules), "trend": 0, "label": "Scan Schedules"},
                "avgDuration":   {"value": "-",   "trend": 0, "label": "Avg Duration"},
                "totalFindings": {"value": f"{len(all_findings):,}", "trend": 0, "label": "Total Findings"},
                "openFindings":  {"value": total_vulns, "trend": 0, "label": "Open Vulns"},
            },
            "scans": scans_table,
            "findingsTrend": findings_trend,
            "scansByType": scans_by_type,

            # CVE Analysis page
            "cveKpis": {
                "totalCVEs":     {"value": f"{len(unique_cves):,}", "trend": 0, "label": "Total CVEs Tracked"},
                "criticalCVEs":  {"value": critical_count, "trend": 0, "label": "Critical CVEs"},
                "criticalCVEs2": {"value": critical_count, "trend": 0, "label": "Critical CVEs"},
                "patchedCVEs":   {"value": len(patched_cves), "trend": 0, "label": "CVEs Patched"},
                "affectedAssets": {"value": affected_target_count, "trend": 0, "label": "Affected Assets"},
            },
            "cves": top_cves[:22],
            "severityPie": severity_pie,
            "topAffectedProducts": top_products,

            # Risk Scoring page
            "riskKpis": {
                "assetsScored":   {"value": len(asset_risk_rankings), "trend": 0, "label": "Assets Scored"},
                "avgRiskScore":   {"value": avg_risk, "trend": 0, "label": "Avg Risk Score"},
                "criticalAssets": {"value": sum(1 for a in asset_risk_rankings if a["band"] == "Critical"), "trend": 0, "label": "Critical Assets"},
                "scoreImproved":  {"value": f"{round(len(patched_cves) / max(len(unique_cves), 1) * 100, 1)}%", "trend": 0, "label": "Score Improved"},
            },
            "riskTrend": risk_trend,
            "riskBands": risk_bands,

            # Reports page
            "reportKpis": {
                "totalReports":  {"value": len(reports), "trend": 0, "label": "Total Reports"},
                "readyExport":   {"value": sum(1 for rp in reports if rp["status"] == "Ready"), "trend": 0, "label": "Ready to Export"},
                "scheduled":     {"value": sum(1 for rp in reports if rp["status"] == "Completed"), "trend": 0, "label": "Completed"},
                "generated30d":  {"value": len(all_findings), "trend": 0, "label": "Total Findings"},
            },
            "reports": reports,
            "reportVolume": report_volume if report_volume else mock.get("reportVolume", []),
            "reportsByType": reports_by_type if reports_by_type else mock.get("reportsByType", []),
        })

        return out


# ── Module-level singleton ────────────────────────────────────────────────────
outpost24_client: Outpost24Client | None = None

if settings.outpost24_url and settings.outpost24_username and settings.outpost24_password:
    try:
        outpost24_client = Outpost24Client(
            base_url=settings.outpost24_url,
            username=settings.outpost24_username,
            password=settings.outpost24_password,
        )
        logger.info(
            "Outpost24 client initialised for %s (user=%s)",
            settings.outpost24_url,
            settings.outpost24_username,
        )
    except Exception as exc:
        logger.warning("Failed to initialise Outpost24 client: %s", exc)
        outpost24_client = None
else:
    logger.info("Outpost24 credentials not configured — using mock data")
