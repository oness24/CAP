from .helpers import generate_time_series, ts, r

_DEPARTMENTS = ["Engineering", "Finance", "HR", "Sales", "Legal", "Marketing", "IT", "Operations"]
_MFA_STATUSES = ["Enabled", "Disabled", "Enforced"]


def get_keeper_dashboard() -> dict:
    return {
        "kpis": {
            "securityScore":   {"value": 82,      "trend": 3,   "label": "Org Security Score"},
            "totalUsers":      {"value": 487,      "trend": 8,   "label": "Total Users"},
            "weakPasswords":   {"value": 143,      "trend": -12, "label": "Weak Passwords"},
            "breachedPasswords":{"value": 7,       "trend": -2,  "label": "Breached Detected"},
            "mfaAdoption":     {"value": "91.4%", "trend": 2.3, "label": "MFA Adoption"},
            "policyCompliance":{"value": "88.2%", "trend": 1.1, "label": "Policy Compliance"},
        },
        "scoreHistory": generate_time_series(30, 79, 5, 24 * 60),
        "passwordStrength": [
            {"name": "Strong", "value": 8920, "color": "#22C55E"},
            {"name": "Fair",   "value": 2340, "color": "#EAB308"},
            {"name": "Weak",   "value": 143,  "color": "#F97316"},
            {"name": "Reused", "value": 412,  "color": "#EF4444"},
        ],
        "deptRiskScores": [
            {"dept": dept, "score": r(60, 97), "users": r(20, 150)}
            for dept in _DEPARTMENTS
        ],
        "highRiskUsers": [
            {
                "id": f"USR-{1000 + i}",
                "user": f"user{r(100, 999)}@corp.com",
                "department": _DEPARTMENTS[r(0, len(_DEPARTMENTS) - 1)],
                "weakCount": r(2, 25),
                "reusedCount": r(0, 15),
                "lastLogin": ts(r(1, 72)),
                "mfaStatus": _MFA_STATUSES[r(0, 2)],
                "riskScore": r(55, 95),
            }
            for i in range(10)
        ],
    }
