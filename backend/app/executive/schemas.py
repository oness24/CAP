from typing import Any, Literal
from pydantic import BaseModel


class WeeklyMetric(BaseModel):
    label: str
    value: str
    delta: str
    direction: Literal["up", "down", "flat"]
    positive: bool


class IncidentRow(BaseModel):
    ref: str
    date: str
    category: str
    description: str
    severity: str
    status: str
    owner: str


class PlatformWeeklyReport(BaseModel):
    platformLabel: str
    riskRating: Literal["Critical", "Elevated", "Moderate", "Stable", "Improving"]
    headline: str
    narrative: str
    metrics: list[WeeklyMetric]
    incidentRows: list[IncidentRow]
    recommendations: list[str]
    preparedBy: str
    reviewedBy: str
    weekLabel: str
