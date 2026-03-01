"""Python equivalents of src/data/mockHelpers.ts"""
import random
from datetime import datetime, timedelta


def r(min_val: int, max_val: int) -> int:
    return random.randint(min_val, max_val)


def generate_time_series(points: int, base_value: float, variance: float, interval_minutes: int = 60) -> list[dict]:
    result = []
    now = datetime.now()
    for i in range(points):
        dt = now - timedelta(minutes=(points - i) * interval_minutes)
        if points <= 48:
            label = dt.strftime("%H:%M")
        else:
            label = f"{dt.strftime('%b')} {dt.day}"  # cross-platform "Feb 7"
        value = max(0, round(base_value + (random.random() - 0.5) * variance * 2, 2))
        result.append({"time": label, "value": value})
    return result


def generate_dual_time_series(
    points: int, base1: float, base2: float, variance: float, interval_minutes: int = 60
) -> list[dict]:
    result = []
    now = datetime.now()
    for i in range(points):
        dt = now - timedelta(minutes=(points - i) * interval_minutes)
        fmt = "%H:%M" if points <= 48 else "%b %d"
        label = dt.strftime(fmt)
        result.append({
            "time": label,
            "value1": max(0, round(base1 + (random.random() - 0.5) * variance * 2, 2)),
            "value2": max(0, round(base2 + (random.random() - 0.5) * variance * 2, 2)),
        })
    return result


def ts(hours_ago: float) -> str:
    dt = datetime.now() - timedelta(hours=hours_ago)
    return dt.strftime("%b %d, %H:%M")


def ts_days(days_ago: int) -> str:
    dt = datetime.now() - timedelta(days=days_ago)
    return dt.strftime("%b %d, %Y")


def random_ip() -> str:
    return f"10.{r(0, 50)}.{r(1, 254)}.{r(1, 254)}"


def hostname(prefix: str, n: int) -> str:
    return f"{prefix}-{str(n).zfill(4)}"
