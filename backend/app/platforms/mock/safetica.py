from .helpers import generate_time_series, ts, r

_DEPARTMENTS = ["Engineering", "Finance", "HR", "Sales", "Legal", "Marketing", "IT"]
_CLASSIFICATIONS = ["PII", "Financial", "Intellectual Property", "Health Data", "Confidential"]
_CHANNELS = ["Email", "USB/Removable", "Cloud Upload", "Print", "Clipboard"]
_ACTIONS = ["Blocked", "Warned", "Allowed (Logged)"]


def get_safetica_dashboard() -> dict:
    return {
        "kpis": {
            "dataTransfers":    {"value": "12,483", "trend": 340,  "label": "Transfers (24h)"},
            "blockedTransfers": {"value": 28,        "trend": 6,    "label": "Blocked"},
            "policyViolations": {"value": 14,        "trend": -2,   "label": "Violations"},
            "usersAtRisk":      {"value": 9,         "trend": 3,    "label": "Users at Risk"},
            "sensitiveFiles":   {"value": 67,        "trend": 12,   "label": "Sensitive Files Moved"},
            "dlpCoverage":      {"value": "99.1%",  "trend": 0,    "label": "DLP Coverage"},
        },
        "transferTrend": generate_time_series(24, 520, 200),
        "channelBreakdown": [
            {"name": "Email",         "value": 4820, "color": "#0D9488"},
            {"name": "USB/Removable", "value": 1240, "color": "#14B8A6"},
            {"name": "Cloud Upload",  "value": 3890, "color": "#0F766E"},
            {"name": "Print",         "value": 2533, "color": "#134E4A"},
        ],
        "violationsByType": [
            {"type": "PII Transfer",      "count": 34},
            {"type": "Financial Data",    "count": 28},
            {"type": "IP / Source Code",  "count": 19},
            {"type": "Health Records",    "count": 12},
            {"type": "Confidential Docs", "count": 8},
        ],
        "recentViolations": [
            {
                "id": f"VIO-2024-{1000 + i}",
                "user": f"user{r(100, 999)}@corp.com",
                "department": _DEPARTMENTS[r(0, len(_DEPARTMENTS) - 1)],
                "channel": _CHANNELS[r(0, len(_CHANNELS) - 1)],
                "classification": _CLASSIFICATIONS[r(0, len(_CLASSIFICATIONS) - 1)],
                "action": _ACTIONS[r(0, len(_ACTIONS) - 1)],
                "riskScore": r(40, 95),
                "timestamp": ts(r(1, 24)),
            }
            for i in range(10)
        ],
    }
