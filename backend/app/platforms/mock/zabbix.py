from .helpers import generate_time_series, generate_dual_time_series, ts, hostname, r

_ZABBIX_GROUPS = ["Production Servers", "Database Cluster", "Web Tier", "Network Devices", "Development", "DMZ"]
_SEVERITIES = ["Disaster", "High", "Average", "Warning", "Information"]
_PROBLEMS = [
    "High CPU utilization", "Disk space warning", "Interface down",
    "MySQL down", "High memory usage", "Ping timeout",
]


def get_zabbix_dashboard() -> dict:
    host_group_status = []
    for group in _ZABBIX_GROUPS:
        total = r(20, 120)
        down = r(0, 5)
        import random
        host_group_status.append({
            "group": group,
            "total": total,
            "up": total - down,
            "down": down,
            "availability": f"{99 + random.random():.2f}%",
        })

    return {
        "kpis": {
            "totalHosts":       {"value": 634,      "trend": 3,     "label": "Total Hosts"},
            "hostsUp":          {"value": 621,       "trend": 0,     "label": "Hosts Up"},
            "hostsDown":        {"value": 13,        "trend": 2,     "label": "Hosts Down"},
            "activeTriggers":   {"value": 47,        "trend": 8,     "label": "Active Triggers"},
            "problems1h":       {"value": 6,         "trend": -3,    "label": "Problems (1h)"},
            "avgAvailability":  {"value": "99.79%", "trend": -0.02, "label": "Avg Availability"},
        },
        "availabilityTrend": generate_time_series(24, 99.7, 0.4),
        "networkThroughput": generate_dual_time_series(24, 1240, 820, 300),
        "triggersBySeverity": [
            {"name": "Disaster", "value": 2,  "color": "#7C3AED"},
            {"name": "High",     "value": 8,  "color": "#EF4444"},
            {"name": "Average",  "value": 18, "color": "#F97316"},
            {"name": "Warning",  "value": 19, "color": "#EAB308"},
        ],
        "hostGroupStatus": host_group_status,
        "activeProblems": [
            {
                "id": f"PROB-{10000 + i}",
                "host": hostname(_ZABBIX_GROUPS[r(0, len(_ZABBIX_GROUPS) - 1)].split(" ")[0].lower(), r(1, 30)),
                "problem": _PROBLEMS[r(0, len(_PROBLEMS) - 1)],
                "severity": _SEVERITIES[r(0, len(_SEVERITIES) - 1)],
                "duration": f"{r(1, 8)}h {r(0, 59)}m",
                "group": _ZABBIX_GROUPS[r(0, len(_ZABBIX_GROUPS) - 1)],
                "age": ts(r(1, 12)),
            }
            for i in range(10)
        ],
    }
