import math
from .helpers import generate_time_series, generate_dual_time_series, ts, ts_days, random_ip, r

_OS_LIST = ["Windows Server 2022", "Windows Server 2019", "Ubuntu 22.04", "CentOS 7", "RHEL 8", "Windows 11"]
_ASSET_TYPES = ["Web Server", "Database", "Workstation", "Network Device", "File Server", "Load Balancer"]

_PRODUCTS = [
    "Fortinet FortiOS", "Palo Alto PAN-OS", "VMware vCenter",
    "Microsoft Exchange", "Apache Log4j", "OpenSSL", "Cisco IOS XE",
    "Ivanti Connect Secure", "MOVEit Transfer", "ConnectWise ScreenConnect",
]

_SCAN_TARGETS = [
    "prod-web-cluster", "db-servers", "corp-workstations", "dmz-segment",
    "cloud-assets", "iot-devices", "vpn-gateways", "dev-environment",
]
_SCAN_TYPES = ["Full Scan", "Quick Scan", "Web App", "Network", "Authenticated"]
_SCAN_STATUSES = ["Completed", "Completed", "Completed", "In Progress", "Failed", "Completed", "Scheduled"]

_SEVERITY_CYCLE = ["Critical", "High", "High", "Medium", "Medium", "Medium", "Low", "Low"]
_CVE_STATUS_CYCLE = ["Active", "Patched", "Mitigated", "Accepted", "Active", "Active", "Patched"]

_REPORT_TYPES = [
    "Executive Summary", "Vulnerability Detail", "Asset Risk",
    "Compliance", "Remediation Status", "CVE Exposure", "Patch Compliance",
]
_SCHEDULES = ["Daily", "Weekly", "Monthly", "On Demand", "Weekly", "Monthly"]
_FORMATS = ["PDF", "CSV", "HTML", "JSON", "PDF", "CSV"]
_REPORT_STATUSES = ["Ready", "Ready", "Running", "Scheduled", "Failed", "Ready"]


def get_outpost24_dashboard() -> dict:
    # ── shared data blocks reused across sub-pages ─────────────────────────

    # -- Top CVEs (used by Dashboard, CVEAnalysis, Remediation) --
    top_cves = [
        {"cveId": "CVE-2024-21762", "score": 9.8,  "severity": "Critical", "affected": 34, "product": "Fortinet FortiOS",            "published": ts_days(45), "status": "Active"},
        {"cveId": "CVE-2024-3400",  "score": 10.0, "severity": "Critical", "affected": 12, "product": "Palo Alto PAN-OS",             "published": ts_days(62), "status": "Mitigated"},
        {"cveId": "CVE-2024-1709",  "score": 10.0, "severity": "Critical", "affected": 28, "product": "ConnectWise ScreenConnect",    "published": ts_days(30), "status": "Active"},
        {"cveId": "CVE-2024-4577",  "score": 9.8,  "severity": "Critical", "affected": 19, "product": "PHP CGI Argument Injection",   "published": ts_days(55), "status": "Active"},
        {"cveId": "CVE-2024-22024", "score": 9.1,  "severity": "Critical", "affected": 8,  "product": "Ivanti Connect Secure",        "published": ts_days(78), "status": "Patched"},
        {"cveId": "CVE-2024-20767", "score": 8.4,  "severity": "High",     "affected": 22, "product": "Adobe ColdFusion",             "published": ts_days(35), "status": "Active"},
        {"cveId": "CVE-2024-27198", "score": 8.3,  "severity": "High",     "affected": 17, "product": "JetBrains TeamCity",           "published": ts_days(48), "status": "Patched"},
        {"cveId": "CVE-2024-21893", "score": 8.2,  "severity": "High",     "affected": 11, "product": "Ivanti Connect Secure",        "published": ts_days(60), "status": "Mitigated"},
        {"cveId": "CVE-2024-28995", "score": 8.6,  "severity": "High",     "affected": 9,  "product": "SolarWinds Serv-U",            "published": ts_days(22), "status": "Active"},
        {"cveId": "CVE-2024-38080", "score": 7.8,  "severity": "High",     "affected": 31, "product": "Microsoft Windows Hyper-V",    "published": ts_days(15), "status": "Active"},
    ] + [
        {
            "cveId":     f"CVE-2024-{10000 + i * 317}",
            "score":     round(4 + (r(0, 30) / 10), 1),
            "severity":  _SEVERITY_CYCLE[(i + 3) % len(_SEVERITY_CYCLE)],
            "affected":  r(1, 45),
            "product":   _PRODUCTS[i % len(_PRODUCTS)],
            "published": ts_days(r(5, 120)),
            "status":    _CVE_STATUS_CYCLE[i % len(_CVE_STATUS_CYCLE)],
        }
        for i in range(12)
    ]

    # -- Asset risk rankings (used by Dashboard, RiskScoring) --
    assets = []
    for i in range(20):
        crit = r(0, 6)
        high = r(0, 25)
        med  = r(5, 60)
        score = min(100, round(crit * 18 + high * 4 + med * 0.5 + r(10, 30)))
        band = "Critical" if score >= 80 else "High" if score >= 60 else "Medium" if score >= 40 else "Low"
        assets.append({
            "asset":       f"asset-{str(i + 1).zfill(3)}",
            "ip":          random_ip(),
            "type":        _ASSET_TYPES[i % len(_ASSET_TYPES)],
            "os":          _OS_LIST[i % len(_OS_LIST)],
            "critical":    crit,
            "high":        high,
            "medium":      med,
            "riskScore":   score,
            "band":        band,
            "lastScanned": ts_days(r(0, 7)),
        })

    # -- Scans (ScanResults page) --
    scans = [
        {
            "id":       f"SCN-{str(1024 + i).zfill(4)}",
            "target":   _SCAN_TARGETS[i % len(_SCAN_TARGETS)],
            "type":     _SCAN_TYPES[i % len(_SCAN_TYPES)],
            "status":   _SCAN_STATUSES[i % len(_SCAN_STATUSES)],
            "started":  ts(i * 4 + 1) if i < 5 else ts_days(i // 2),
            "duration": f"{r(8, 240)}m",
            "critical": r(0, 5),
            "high":     r(0, 25),
            "medium":   r(5, 80),
            "low":      r(10, 200),
        }
        for i in range(18)
    ]

    # -- Reports (Reports page) --
    reports = [
        {
            "id":       f"RPT-{str(800 + i).zfill(4)}",
            "name":     f"{_REPORT_TYPES[i % len(_REPORT_TYPES)]} — {['Q1','Q2','Weekly','Monthly','Ad-hoc'][i % 5]} {2024 + i // 8}",
            "type":     _REPORT_TYPES[i % len(_REPORT_TYPES)],
            "schedule": _SCHEDULES[i % len(_SCHEDULES)],
            "lastRun":  ts_days(r(0, 14)),
            "nextRun":  ts_days(-r(1, 14)),
            "format":   _FORMATS[i % len(_FORMATS)],
            "status":   _REPORT_STATUSES[i % len(_REPORT_STATUSES)],
            "pages":    r(4, 48),
        }
        for i in range(16)
    ]

    # ── risk scoring aggregates ──────────────────────────────────────────
    risk_bands = [
        {"label": "Critical (80–100)", "count": sum(1 for a in assets if a["band"] == "Critical"), "color": "#EF4444"},
        {"label": "High (60–79)",      "count": sum(1 for a in assets if a["band"] == "High"),     "color": "#F97316"},
        {"label": "Medium (40–59)",    "count": sum(1 for a in assets if a["band"] == "Medium"),   "color": "#EAB308"},
        {"label": "Low (0–39)",        "count": sum(1 for a in assets if a["band"] == "Low"),      "color": "#22C55E"},
    ]
    avg_risk = round(sum(a["riskScore"] for a in assets) / len(assets)) if assets else 0
    crit_count = sum(1 for a in assets if a["band"] == "Critical")

    return {
        # ── Main Dashboard page ──────────────────────────────────────────
        "kpis": {
            "totalVulns":      {"value": "3,847", "trend": -124, "label": "Total Vulnerabilities"},
            "criticalCVEs":    {"value": 23,       "trend": -4,   "label": "Critical CVEs"},
            "avgCVSS":         {"value": "6.8",   "trend": -0.3, "label": "Avg CVSS Score"},
            "assetsScanned":   {"value": 847,      "trend": 12,   "label": "Assets Scanned"},
            "remediated7d":    {"value": 156,      "trend": 34,   "label": "Remediated (7d)"},
            "patchCompliance": {"value": "76.4%", "trend": 2.1,  "label": "Patch Compliance"},
        },
        "vulnTrend": generate_dual_time_series(30, 3800, 156, 200, 24 * 60 // 30),
        "cvssDistribution": [
            {"range": "9.0–10.0", "label": "Critical", "count": 23,   "color": "#EF4444"},
            {"range": "7.0–8.9",  "label": "High",     "count": 187,  "color": "#F97316"},
            {"range": "4.0–6.9",  "label": "Medium",   "count": 1423, "color": "#EAB308"},
            {"range": "0.1–3.9",  "label": "Low",      "count": 2214, "color": "#22C55E"},
        ],
        "topCVEs": top_cves,
        "assetRiskRankings": assets,

        # ── Scan Results page ────────────────────────────────────────────
        "scanKpis": {
            "scansToday":    {"value": 7,       "trend": 2,   "label": "Scans Today"},
            "avgDuration":   {"value": "42m",   "trend": -5,  "label": "Avg Duration"},
            "totalFindings": {"value": "1,284", "trend": -89, "label": "Total Findings"},
            "openFindings":  {"value": 847,     "trend": -34, "label": "Open Findings"},
        },
        "scans": scans,
        "findingsTrend": generate_time_series(14, 120, 40),
        "scansByType": [
            {"label": "Full Scan",  "count": 14},
            {"label": "Quick Scan", "count": 31},
            {"label": "Web App",    "count": 8},
            {"label": "Network",    "count": 19},
            {"label": "Auth",       "count": 11},
        ],

        # ── CVE Analysis page ────────────────────────────────────────────
        "cveKpis": {
            "totalCVEs":    {"value": "3,847", "trend": -124, "label": "Total CVEs Tracked"},
            "criticalCVEs": {"value": 23,      "trend": -4,   "label": "Critical CVEs"},
            "patchedCVEs":  {"value": 312,     "trend": 87,   "label": "CVEs Patched (30d)"},
            "affectedAssets": {"value": 847,   "trend": 12,   "label": "Affected Assets"},
        },
        "cves": top_cves,
        "severityPie": [
            {"name": "Critical", "value": 23,   "color": "#EF4444"},
            {"name": "High",     "value": 187,  "color": "#F97316"},
            {"name": "Medium",   "value": 1423, "color": "#EAB308"},
            {"name": "Low",      "value": 2214, "color": "#22C55E"},
        ],
        "topAffectedProducts": [
            {"label": "Fortinet FortiOS",   "count": 34},
            {"label": "MS Windows Hyper-V", "count": 31},
            {"label": "ConnectWise",        "count": 28},
            {"label": "PHP CGI",            "count": 19},
            {"label": "JetBrains TeamCity", "count": 17},
            {"label": "Adobe ColdFusion",   "count": 14},
        ],

        # ── Risk Scoring page ────────────────────────────────────────────
        "riskKpis": {
            "assetsScored":   {"value": len(assets), "trend": 3,   "label": "Assets Scored"},
            "avgRiskScore":   {"value": avg_risk,    "trend": -2,  "label": "Avg Risk Score"},
            "criticalAssets": {"value": crit_count,  "trend": -1,  "label": "Critical Assets"},
            "scoreImproved":  {"value": "76.4%",     "trend": 2.1, "label": "Score Improved"},
        },
        "riskTrend": generate_time_series(30, 62, 8, 24 * 60 // 30),
        "riskBands": risk_bands,

        # ── Reports page ─────────────────────────────────────────────────
        "reportKpis": {
            "totalReports":  {"value": len(reports),                                          "trend": 3,  "label": "Total Reports"},
            "readyExport":   {"value": sum(1 for rp in reports if rp["status"] == "Ready"),   "trend": 2,  "label": "Ready to Export"},
            "scheduled":     {"value": sum(1 for rp in reports if rp["status"] == "Scheduled"), "trend": 0, "label": "Scheduled"},
            "generated30d":  {"value": 47,                                                    "trend": 12, "label": "Generated (30d)"},
        },
        "reports": reports,
        "reportVolume": [
            {"label": "Sep", "count": 12},
            {"label": "Oct", "count": 15},
            {"label": "Nov", "count": 11},
            {"label": "Dec", "count": 9},
            {"label": "Jan", "count": 18},
            {"label": "Feb", "count": 21},
        ],
        "reportsByType": [
            {"label": t.split(" ")[0], "count": r(3, 12) + i}
            for i, t in enumerate(_REPORT_TYPES)
        ],
    }
