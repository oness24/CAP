from typing import Any
from pydantic import BaseModel


PLATFORM_CONFIGS = [
    {"id": "crowdstrike", "name": "CrowdStrike",  "category": "Endpoint Detection & Response", "color": "#1D6AE5"},
    {"id": "wazuh",       "name": "Wazuh",         "category": "Security Information & Event Management", "color": "#7C3AED"},
    {"id": "outpost24",   "name": "Outpost24",      "category": "Vulnerability Management",     "color": "#EA580C"},
    {"id": "keeper",      "name": "Keeper",         "category": "Password Security & Vault Management", "color": "#16A34A"},
    {"id": "zabbix",      "name": "Zabbix",         "category": "Infrastructure Monitoring",    "color": "#DC2626"},
]

VALID_PLATFORM_IDS = {p["id"] for p in PLATFORM_CONFIGS}


class PlatformConfig(BaseModel):
    id: str
    name: str
    category: str
    color: str


class DashboardResponse(BaseModel):
    platform_id: str
    data: dict[str, Any]


class IncidentsResponse(BaseModel):
    platform_id: str
    page: int
    limit: int
    total: int
    items: list[dict[str, Any]]


class PagedResponse(BaseModel):
    platform_id: str
    page: int
    limit: int
    total: int
    items: list[dict[str, Any]]


class TimeSeriesResponse(BaseModel):
    platform_id: str
    metric: str
    hours: int
    data: list[dict[str, Any]]
