"""Python equivalent of src/data/executive/weeklyReports.ts"""
from datetime import datetime, timedelta


def _fmt(dt: datetime) -> str:
    """Cross-platform date format: 'Feb 7' or 'Feb 27' (no leading zero)."""
    return f"{dt.strftime('%b')} {dt.day}"


def _week_label(weeks_back: int = 0) -> str:
    base = datetime.now() - timedelta(weeks=weeks_back)
    monday = base - timedelta(days=base.weekday())
    sunday = monday + timedelta(days=6)
    return f"{_fmt(monday)} – {_fmt(sunday)}, {sunday.year}"


_NOW = datetime.now()

REPORTS = {
    "crowdstrike": {
        "platformLabel": "CrowdStrike · Endpoint Detection & Response",
        "riskRating": "Stable",
        "headline": "Endpoint security posture remained strong; critical incident volume declined 19% week-over-week.",
        "narrative": (
            "This week, the organization maintained robust endpoint protection across 2,847 managed assets, "
            "with detection response performance operating within established SLA parameters. "
            "The security team recorded 34 active detections and successfully resolved 7 escalated incidents, "
            "achieving a mean time to respond of 4.2 minutes — a 16% improvement over the prior period. "
            "Three critical-severity threats related to process injection and credential dumping were fully contained; "
            "no lateral movement or data exfiltration was confirmed. "
            "Overall endpoint risk posture is rated Stable, with a continued improving trajectory supported by "
            "policy enforcement coverage of 98.6% across the managed fleet."
        ),
        "metrics": [
            {"label": "Incidents Resolved",   "value": "7",     "delta": "–3 vs prior week", "direction": "down", "positive": True},
            {"label": "Critical Threats",     "value": "3",     "delta": "–1 vs prior week", "direction": "down", "positive": True},
            {"label": "Mean Time to Respond", "value": "4.2m",  "delta": "–16%",             "direction": "down", "positive": True},
            {"label": "Endpoint Coverage",    "value": "98.6%", "delta": "+0.4pp",           "direction": "up",   "positive": True},
        ],
        "recommendations": [
            "Accelerate rollout of the updated prevention policy to the remaining 1.4% of unprotected endpoints by end of next business week.",
            "Conduct a post-incident review for the three critical-severity containment events to validate detection logic and update runbooks.",
            "Evaluate expanding behavioral analytics coverage to macOS endpoints, which currently represent 10% of the managed fleet without full prevention policy.",
        ],
        "incidentRows": [
            {"ref": "INC-2024-0891", "date": _fmt(_NOW), "category": "Malware",          "description": "Process injection detected on CORP-WKSTN endpoint",       "severity": "Critical", "status": "Resolved",      "owner": "J. Chen"},
            {"ref": "INC-2024-0890", "date": _fmt(_NOW), "category": "Credential Theft", "description": "Credential dumping attempt via LSASS",                    "severity": "Critical", "status": "Resolved",      "owner": "A. Patel"},
            {"ref": "INC-2024-0889", "date": _fmt(_NOW), "category": "Execution",        "description": "Suspicious PowerShell script execution",                  "severity": "High",     "status": "Resolved",      "owner": "M. Kim"},
            {"ref": "INC-2024-0888", "date": _fmt(_NOW), "category": "Ransomware",       "description": "File encryption attempt detected and blocked",            "severity": "Critical", "status": "Resolved",      "owner": "J. Chen"},
            {"ref": "INC-2024-0887", "date": _fmt(_NOW), "category": "Phishing",         "description": "Spear-phishing payload delivery blocked",                 "severity": "Medium",   "status": "Resolved",      "owner": "R. Torres"},
            {"ref": "INC-2024-0886", "date": _fmt(_NOW), "category": "C2 Communication", "description": "Unauthorized outbound C2 beacon detected",               "severity": "High",     "status": "Investigating", "owner": "A. Patel"},
            {"ref": "INC-2024-0885", "date": _fmt(_NOW), "category": "Persistence",      "description": "Unauthorized account with valid credentials",             "severity": "Medium",   "status": "Resolved",      "owner": "M. Kim"},
        ],
        "preparedBy": "SOC Operations — CrowdStrike Team",
        "reviewedBy": "Chief Information Security Officer",
    },

    "wazuh": {
        "platformLabel": "Wazuh · Security Information & Event Management",
        "riskRating": "Moderate",
        "headline": "Alert volume elevated 19% week-over-week; compliance frameworks maintained above threshold across all standards.",
        "narrative": (
            "The SIEM platform processed 1,482 security alerts this week across 312 monitored agents, representing a 19% increase "
            "in event volume versus the prior period, driven primarily by elevated SSH brute-force activity originating from external IP ranges. "
            "Critical event count declined by 3 incidents to 18, indicating effective upstream blocking measures. "
            "Compliance posture remains strong, with PCI-DSS coverage at 94.2% and all five monitored frameworks scoring above the 85% target threshold. "
            "Risk rating is assessed at Moderate; the increase in authentication-based attack attempts warrants continued monitoring and potential geo-blocking policy review."
        ),
        "metrics": [
            {"label": "Security Alerts",    "value": "1,482", "delta": "+19% volume",    "direction": "up",   "positive": False},
            {"label": "Critical Events",    "value": "18",    "delta": "–3 vs prior",    "direction": "down", "positive": True},
            {"label": "PCI-DSS Compliance", "value": "94.2%", "delta": "+1.1pp",         "direction": "up",   "positive": True},
            {"label": "Agents Online",      "value": "298",   "delta": "95.5% of fleet", "direction": "flat", "positive": True},
        ],
        "recommendations": [
            "Implement geo-based IP blocking rules for SSH traffic originating from high-risk regions to reduce authentication noise.",
            "Investigate 14 agents currently reporting offline status and restore full coverage within 48 hours.",
            "Review and consolidate the 47 triggered detection rules to eliminate duplicative alerting and reduce analyst fatigue.",
        ],
        "incidentRows": [
            {"ref": "EVT-5712-001",   "date": _fmt(_NOW), "category": "Authentication",    "description": "Sustained SSH brute-force campaign — 847 attempts",             "severity": "High",     "status": "Monitoring",    "owner": "L. Ahmed"},
            {"ref": "EVT-31101-001",  "date": _fmt(_NOW), "category": "Web Attack",        "description": "SQL injection attempts against web application tier",           "severity": "High",     "status": "Blocked",       "owner": "S. Tanaka"},
            {"ref": "EVT-2932-001",   "date": _fmt(_NOW), "category": "Exploitation",      "description": "Shellshock exploitation attempt on legacy web server",          "severity": "Critical", "status": "Contained",     "owner": "L. Ahmed"},
            {"ref": "EVT-87104-001",  "date": _fmt(_NOW), "category": "Malware",           "description": "Known malware hash identified on workstation asset",            "severity": "Critical", "status": "Quarantined",   "owner": "P. Osei"},
            {"ref": "EVT-18149-001",  "date": _fmt(_NOW), "category": "Network Intrusion", "description": "Suricata IDS: Emerging threat signature match on perimeter",   "severity": "High",     "status": "Investigating", "owner": "S. Tanaka"},
            {"ref": "EVT-5710-001",   "date": _fmt(_NOW), "category": "Reconnaissance",    "description": "Repeated login attempts with non-existent usernames",           "severity": "Medium",   "status": "Monitoring",    "owner": "P. Osei"},
        ],
        "preparedBy": "SOC Operations — SIEM Team",
        "reviewedBy": "Chief Information Security Officer",
    },

    "safetica": {
        "platformLabel": "Safetica · Data Loss Prevention",
        "riskRating": "Elevated",
        "headline": "DLP engine blocked 28 unauthorized transfers; 9 high-risk users identified requiring immediate review.",
        "narrative": (
            "The organization's data loss prevention platform monitored 12,483 outbound data transfer events this week, "
            "successfully blocking 28 policy violations before exfiltration could occur. "
            "Nine users have been flagged as high-risk based on repeated sensitive data movement patterns across unapproved channels, "
            "including USB removable media and personal cloud storage uploads. "
            "Fourteen policy violations were formally logged, representing a 2-event improvement over the prior period; however, "
            "the volume of sensitive file movements involving PII and financial data remains above acceptable baseline thresholds. "
            "Risk posture is rated Elevated and immediate review of flagged user accounts is recommended to the CISO."
        ),
        "metrics": [
            {"label": "Transfers Monitored", "value": "12,483", "delta": "+340 vs prior", "direction": "up",   "positive": False},
            {"label": "Blocked Transfers",   "value": "28",     "delta": "+6 blocked",    "direction": "up",   "positive": True},
            {"label": "Policy Violations",   "value": "14",     "delta": "–2 vs prior",   "direction": "down", "positive": True},
            {"label": "Users at Risk",       "value": "9",      "delta": "+3 flagged",    "direction": "up",   "positive": False},
        ],
        "recommendations": [
            "Initiate HR-led review of the 9 flagged high-risk users and suspend USB data transfer rights pending investigation.",
            "Update DLP classification engine to include new financial quarter document templates currently not captured in policy scope.",
            "Brief department managers on acceptable use policies, with emphasis on cloud upload channels showing the highest violation rate.",
        ],
        "incidentRows": [
            {"ref": "DLP-2024-0114", "date": _fmt(_NOW), "category": "PII Exposure",   "description": "Employee HR records uploaded to personal cloud storage",     "severity": "Critical", "status": "Blocked",       "owner": "K. Sharma"},
            {"ref": "DLP-2024-0113", "date": _fmt(_NOW), "category": "Financial Data", "description": "Q4 financial projections transferred to USB device",         "severity": "High",     "status": "Blocked",       "owner": "N. Williams"},
            {"ref": "DLP-2024-0112", "date": _fmt(_NOW), "category": "IP Transfer",    "description": "Source code repository copied to external storage",          "severity": "Critical", "status": "Investigating", "owner": "K. Sharma"},
            {"ref": "DLP-2024-0111", "date": _fmt(_NOW), "category": "Email Exfil",    "description": "Customer database extract sent via personal email",          "severity": "High",     "status": "Blocked",       "owner": "N. Williams"},
            {"ref": "DLP-2024-0110", "date": _fmt(_NOW), "category": "Print / Copy",   "description": "Bulk print of sensitive client contracts (unregistered device)", "severity": "Medium", "status": "Logged",      "owner": "T. Ferreira"},
        ],
        "preparedBy": "SOC Operations — DLP Team",
        "reviewedBy": "Chief Information Security Officer",
    },

    "outpost24": {
        "platformLabel": "Outpost24 · Vulnerability Management",
        "riskRating": "Moderate",
        "headline": "Vulnerability backlog reduced by 124 items; critical CVE exposure declined 4 findings week-over-week.",
        "narrative": (
            "The vulnerability management programme made measurable progress this week, with the total open vulnerability count "
            "declining from 3,971 to 3,847 — a net reduction of 124 findings, representing 156 remediated versus 32 newly discovered. "
            "Critical CVE exposure decreased to 23 unresolved items, with two zero-day vulnerabilities (CVE-2024-3400 and CVE-2024-1709) "
            "confirmed as patched across all 28 affected assets. "
            "Patch compliance across the 847-asset estate stands at 76.4%, below the 85% organizational target, requiring accelerated "
            "remediation focus on the Windows Server 2019 cohort. "
            "Overall risk posture is rated Moderate, with a positive remediation trajectory but continued exposure in network appliance "
            "and legacy infrastructure categories."
        ),
        "metrics": [
            {"label": "Open Vulnerabilities", "value": "3,847",  "delta": "–124 this week", "direction": "down", "positive": True},
            {"label": "Critical CVEs",        "value": "23",     "delta": "–4 resolved",    "direction": "down", "positive": True},
            {"label": "Remediated (7d)",      "value": "156",    "delta": "+34 vs target",  "direction": "up",   "positive": True},
            {"label": "Patch Compliance",     "value": "76.4%",  "delta": "+2.1pp",         "direction": "up",   "positive": True},
        ],
        "recommendations": [
            "Prioritize emergency patching of Windows Server 2019 assets to close the 8.6% gap to the 85% patch compliance target within the next 10 business days.",
            "Escalate CVE-2024-21762 (CVSS 9.8) affecting 34 Fortinet assets to the network team for immediate patch deployment.",
            "Commission a targeted penetration test on the 23 assets with confirmed critical CVE exposure to validate current compensating controls.",
        ],
        "incidentRows": [
            {"ref": "CVE-2024-21762", "date": _fmt(_NOW), "category": "Network Appliance", "description": "CVSS 9.8 — Fortinet FortiOS heap-based buffer overflow (34 assets)",    "severity": "Critical", "status": "In Remediation", "owner": "Infra Team"},
            {"ref": "CVE-2024-3400",  "date": _fmt(_NOW), "category": "Firewall",          "description": "CVSS 10.0 — Palo Alto PAN-OS command injection (12 assets)",            "severity": "Critical", "status": "Patched",        "owner": "Network Ops"},
            {"ref": "CVE-2024-1709",  "date": _fmt(_NOW), "category": "Remote Access",     "description": "CVSS 10.0 — ConnectWise ScreenConnect auth bypass (28 assets)",        "severity": "Critical", "status": "Patched",        "owner": "Endpoint Team"},
            {"ref": "CVE-2024-4577",  "date": _fmt(_NOW), "category": "Web Server",        "description": "CVSS 9.8 — PHP CGI argument injection (19 assets)",                    "severity": "Critical", "status": "In Remediation", "owner": "Web Team"},
            {"ref": "CVE-2024-22024", "date": _fmt(_NOW), "category": "VPN / Access",      "description": "CVSS 9.1 — Ivanti Connect Secure XXE injection (8 assets)",            "severity": "High",     "status": "Scheduled",      "owner": "Infra Team"},
        ],
        "preparedBy": "SOC Operations — Vulnerability Management Team",
        "reviewedBy": "Chief Information Security Officer",
    },

    "keeper": {
        "platformLabel": "Keeper · Password Security & Vault Management",
        "riskRating": "Stable",
        "headline": "Organizational security score improved to 82/100; breached credential count reduced by 2 this week.",
        "narrative": (
            "The organization's credential security posture continued its positive trajectory this week, with the overall Keeper Security Score "
            "improving 3 points to 82 out of 100. "
            "The vault audit identified 143 weak passwords requiring remediation — a 12-credential improvement over the prior period — "
            "and detected 7 credentials matching known breach databases, down from 9. "
            "MFA adoption across the 487-user fleet reached 91.4%, with 43 users in Finance and HR departments remaining non-compliant "
            "with the mandatory MFA policy. "
            "Password policy compliance stands at 88.2%, trending upward; leadership is advised to prioritize the Sales department, "
            "which represents the lowest departmental score at 69."
        ),
        "metrics": [
            {"label": "Security Score",    "value": "82/100", "delta": "+3 this week",  "direction": "up",   "positive": True},
            {"label": "Weak Passwords",    "value": "143",    "delta": "–12 resolved",  "direction": "down", "positive": True},
            {"label": "Breached Detected", "value": "7",      "delta": "–2 cleared",    "direction": "down", "positive": True},
            {"label": "MFA Adoption",      "value": "91.4%",  "delta": "+2.3pp gained", "direction": "up",   "positive": True},
        ],
        "recommendations": [
            "Issue mandatory password rotation notice to all 143 users with weak credentials, with a 5-business-day compliance deadline.",
            "Enforce MFA policy for the 43 non-compliant users in Finance and HR; escalate persistent non-compliance to department heads.",
            "Target the Sales department (69/100 score) with a focused security awareness session and automated password strength enforcement.",
        ],
        "incidentRows": [
            {"ref": "KPR-2024-0043", "date": _fmt(_NOW), "category": "Credential Breach", "description": "7 user passwords confirmed in HaveIBeenPwned breach database",         "severity": "High",   "status": "Notified",     "owner": "IT Security"},
            {"ref": "KPR-2024-0042", "date": _fmt(_NOW), "category": "Policy Violation",  "description": "Finance Dept: 12 users exceeding 180-day password age limit",          "severity": "Medium", "status": "Remediation",  "owner": "Help Desk"},
            {"ref": "KPR-2024-0041", "date": _fmt(_NOW), "category": "MFA Gap",           "description": "43 users in Finance and HR without MFA enrollment",                    "severity": "High",   "status": "In Progress",  "owner": "IAM Team"},
            {"ref": "KPR-2024-0040", "date": _fmt(_NOW), "category": "Reused Credentials","description": "412 reused passwords detected across shared vault entries",            "severity": "Medium", "status": "Review",       "owner": "IT Security"},
            {"ref": "KPR-2024-0039", "date": _fmt(_NOW), "category": "Privileged Access", "description": "Admin vault: 3 entries without rotation in 365+ days",                "severity": "High",   "status": "Escalated",    "owner": "CISO Office"},
        ],
        "preparedBy": "SOC Operations — Identity & Access Team",
        "reviewedBy": "Chief Information Security Officer",
    },

    "zabbix": {
        "platformLabel": "Zabbix · Infrastructure Monitoring",
        "riskRating": "Moderate",
        "headline": "Overall infrastructure availability held at 99.79%; 13 hosts offline with elevated trigger activity in database tier.",
        "narrative": (
            "The organization's monitored infrastructure maintained 99.79% average availability across 634 managed hosts this week, "
            "operating within the 99.5% SLA target. "
            "Thirteen hosts are currently in a degraded or offline state, with the majority concentrated in the database cluster group; "
            "root cause analysis is in progress for 2 Disaster-severity triggers affecting production database connectivity. "
            "Active trigger count rose by 8 to 47, driven by capacity-related warnings in the web tier following a traffic spike on Wednesday. "
            "Risk posture is assessed at Moderate; immediate attention is recommended for the database cluster events to mitigate potential "
            "service continuity impact before the upcoming quarter-end processing window."
        ),
        "metrics": [
            {"label": "Infrastructure Availability", "value": "99.79%", "delta": "–0.02pp vs target",  "direction": "down", "positive": True},
            {"label": "Hosts Offline",               "value": "13",     "delta": "+2 this week",        "direction": "up",   "positive": False},
            {"label": "Active Triggers",             "value": "47",     "delta": "+8 new triggers",     "direction": "up",   "positive": False},
            {"label": "Problems Resolved (7d)",      "value": "41",     "delta": "87% resolution rate", "direction": "up",   "positive": True},
        ],
        "recommendations": [
            "Escalate the 2 Disaster-severity database triggers to the DBA team for immediate resolution ahead of quarter-end processing.",
            "Provision additional web-tier capacity to address the Wednesday traffic spike and prevent recurrence of the 19 Average-severity warnings.",
            "Review the 13 offline hosts and establish a remediation SLA; assets offline beyond 72 hours should be flagged to the infrastructure owner.",
        ],
        "incidentRows": [
            {"ref": "ZBX-2024-D001", "date": _fmt(_NOW), "category": "Database",  "description": "Production DB cluster — primary node unavailable (2h 14m)",      "severity": "Disaster", "status": "Investigating", "owner": "DBA Team"},
            {"ref": "ZBX-2024-D002", "date": _fmt(_NOW), "category": "Database",  "description": "MySQL replication lag exceeded 120s threshold",                   "severity": "Disaster", "status": "Mitigated",     "owner": "DBA Team"},
            {"ref": "ZBX-2024-H001", "date": _fmt(_NOW), "category": "Server",    "description": "db-prod-001: CPU utilization sustained above 90%",                "severity": "High",     "status": "Monitoring",    "owner": "Infra Ops"},
            {"ref": "ZBX-2024-H002", "date": _fmt(_NOW), "category": "Storage",   "description": "web-lb-002: Disk utilization exceeded 85% warning threshold",    "severity": "Average",  "status": "In Progress",   "owner": "Storage Team"},
            {"ref": "ZBX-2024-H003", "date": _fmt(_NOW), "category": "Network",   "description": "Core switch interface flap detected — 3 occurrences",            "severity": "High",     "status": "Resolved",      "owner": "Network Ops"},
            {"ref": "ZBX-2024-W001", "date": _fmt(_NOW), "category": "Web Tier",  "description": "Load balancer: Request queue depth warning (traffic spike)",      "severity": "Average",  "status": "Resolved",      "owner": "Web Ops"},
        ],
        "preparedBy": "SOC Operations — Infrastructure Team",
        "reviewedBy": "Chief Information Security Officer",
    },
}


def get_weekly_report(platform_id: str, weeks_back: int = 0) -> dict:
    report = REPORTS.get(platform_id)
    if report is None:
        raise KeyError(f"No report for platform: {platform_id}")
    return {**report, "weekLabel": _week_label(weeks_back)}
