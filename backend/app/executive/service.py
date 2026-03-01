from .mock import get_weekly_report as _get_weekly_report
from .schemas import PlatformWeeklyReport


def get_weekly_report(platform_id: str, weeks_back: int = 0) -> PlatformWeeklyReport:
    data = _get_weekly_report(platform_id, weeks_back)
    return PlatformWeeklyReport(**data)
