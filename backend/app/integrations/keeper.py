"""
Keeper Security integration — cache-file based.

The backend NEVER authenticates with Keeper directly.
Data is read from .keeper_cache.json, produced by running
    python _keeper_refresh.py
once (interactively, with 2FA).  Re-run only when you want fresh data.
"""

import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

_CACHE_FILE = Path(__file__).resolve().parents[2] / ".keeper_cache.json"


def _unavailable_payload(scope: str, reason: str = "Keeper data not available") -> dict:
    now = datetime.now(tz=timezone.utc)
    score_history = [
        {"timestamp": (now - timedelta(days=(29 - i))).replace(microsecond=0).isoformat().replace("+00:00", "Z"), "value": 0}
        for i in range(30)
    ]
    return {
        "_live": False,
        "_scope": scope,
        "_reason": reason,
        "kpis": {
            "securityScore":    {"value": 0, "trend": 0, "label": "Org Security Score"},
            "totalUsers":       {"value": 0, "trend": 0, "label": "Total Users"},
            "weakPasswords":    {"value": 0, "trend": 0, "label": "Weak Passwords"},
            "breachedPasswords":{"value": 0, "trend": 0, "label": "Breached Detected"},
            "mfaAdoption":      {"value": "0.0%", "trend": 0, "label": "MFA Adoption"},
            "policyCompliance": {"value": "0.0%", "trend": 0, "label": "Policy Compliance"},
        },
        "scoreHistory": score_history,
        "passwordStrength": [
            {"name": "Strong", "value": 0, "color": "#22C55E"},
            {"name": "Fair",   "value": 0, "color": "#EAB308"},
            {"name": "Weak",   "value": 0, "color": "#F97316"},
            {"name": "Reused", "value": 0, "color": "#EF4444"},
        ],
        "deptRiskScores": [],
        "highRiskUsers": [],
    }


# ── Helpers ───────────────────────────────────────────────────────────────── #

def _pct(num: int, den: int) -> str:
    if den <= 0:
        return "0.0%"
    return f"{round((num / den) * 100, 1)}%"


def _iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


# ── Dashboard builder (pure — no network) ────────────────────────────────── #

def _build_dashboard(user_rows: list[dict], audit_rows: list[dict], scope: str) -> dict:
    users_by_email: dict[str, dict] = {}
    for u in user_rows:
        email = str(u.get("email", "")).strip().lower()
        if email:
            users_by_email[email] = u

    audit_matched: list[dict] = []
    for row in audit_rows:
        email = str(row.get("email", "")).strip().lower()
        if email in users_by_email:
            audit_matched.append(row)

    total_users = len(users_by_email)
    if total_users == 0:
        return _unavailable_payload(scope, "Cache contains zero users")

    weak_total = reused_total = strong_total = fair_total = 0
    score_values: list[float] = []
    mfa_enabled = 0
    high_risk_users: list[dict] = []
    dept_scores: dict[str, list[float]] = defaultdict(list)

    for row in audit_matched:
        email = str(row.get("email", "")).strip().lower()
        user_meta = users_by_email.get(email, {})

        weak   = max(int(row.get("weak", 0) or 0), 0)
        reused = max(int(row.get("reused", 0) or 0), 0)
        strong = max(int(row.get("strong", 0) or 0), 0)
        medium = max(int(row.get("medium", 0) or row.get("fair", 0) or 0), 0)
        score  = float(row.get("securityScore", 0) or 0)
        mfa    = str(row.get("twoFactorChannel", "")).strip().lower()

        weak_total   += weak
        reused_total += reused
        strong_total += strong
        fair_total   += medium
        score_values.append(score)
        if mfa in ("on", "enabled", "enforced"):
            mfa_enabled += 1

        teams = user_meta.get("teams", [])
        if isinstance(teams, list) and teams:
            dept = teams[0]
        else:
            node = str(user_meta.get("node", "") or "General")
            dept = node.split("/")[-1].strip() or "General"
        dept_scores[dept].append(score)

        risk_score = max(0, min(100, round(100 - score + weak * 1.2 + reused * 1.6)))
        mfa_status = "Enabled" if mfa in ("on", "enabled", "enforced") else "Disabled"

        high_risk_users.append({
            "id": f"USR-{len(high_risk_users) + 1000}",
            "user": email,
            "department": dept,
            "weakCount": weak,
            "reusedCount": reused,
            "lastLogin": str(user_meta.get("last_login", "N/A")),
            "mfaStatus": mfa_status,
            "riskScore": risk_score,
        })

    high_risk_users.sort(key=lambda x: x["riskScore"], reverse=True)
    top_risk = high_risk_users[:10]

    avg_score = round(sum(score_values) / len(score_values), 1) if score_values else 0.0
    security_score = int(round(avg_score))
    breached_count = sum(1 for u in audit_matched if int(u.get("reused", 0) or 0) > 0)

    dept_risk_list = [
        {"dept": d, "score": round(sum(s) / len(s), 1), "users": len(s)}
        for d, s in dept_scores.items()
    ]
    dept_risk_list.sort(key=lambda d: d["score"])

    now = datetime.now(tz=timezone.utc)
    score_history = [
        {"timestamp": _iso(now - timedelta(days=(29 - i))), "value": security_score}
        for i in range(30)
    ]

    return {
        "_live": True,
        "_scope": scope,
        "kpis": {
            "securityScore":    {"value": security_score, "trend": 0, "label": "Org Security Score"},
            "totalUsers":       {"value": total_users, "trend": 0, "label": "Total Users"},
            "weakPasswords":    {"value": weak_total, "trend": 0, "label": "Weak Passwords"},
            "breachedPasswords":{"value": breached_count, "trend": 0, "label": "Breached Detected"},
            "mfaAdoption":      {"value": _pct(mfa_enabled, total_users), "trend": 0, "label": "MFA Adoption"},
            "policyCompliance": {"value": _pct(max(total_users - len(top_risk), 0), total_users), "trend": 0, "label": "Policy Compliance"},
        },
        "scoreHistory": score_history,
        "passwordStrength": [
            {"name": "Strong", "value": strong_total, "color": "#22C55E"},
            {"name": "Fair",   "value": fair_total,   "color": "#EAB308"},
            {"name": "Weak",   "value": weak_total,   "color": "#F97316"},
            {"name": "Reused", "value": reused_total,  "color": "#EF4444"},
        ],
        "deptRiskScores": dept_risk_list,
        "highRiskUsers": top_risk,
    }


# ── Client (reads from cache file only — no API calls, no auth) ──────────── #

class KeeperClient:
    def __init__(self, client_filter: str) -> None:
        self._scope = (client_filter or "").strip()
        self._payload: dict | None = None

    def _load_cache(self) -> dict:
        if not _CACHE_FILE.exists():
            logger.warning("Keeper cache not found at %s — run _keeper_refresh.py", _CACHE_FILE)
            return _unavailable_payload(self._scope, "Run  python _keeper_refresh.py  to fetch data (one-time 2FA)")

        with open(_CACHE_FILE, "r", encoding="utf-8") as f:
            cache = json.load(f)

        user_rows  = cache.get("user_report", [])
        audit_rows = cache.get("security_audit", [])
        fetched_at = cache.get("fetched_at", "unknown")

        logger.info("Keeper cache loaded: %d users, %d audit rows (fetched %s)", len(user_rows), len(audit_rows), fetched_at)
        return _build_dashboard(user_rows, audit_rows, self._scope)

    def fetch_dashboard(self, _mock_fallback: dict) -> dict:
        if self._payload is None:
            try:
                self._payload = self._load_cache()
            except Exception as exc:
                logger.warning("Keeper cache read failed: %s", exc)
                self._payload = _unavailable_payload(self._scope, str(exc))
        return self._payload


# ── Module-level singleton ────────────────────────────────────────────────── #

keeper_client: KeeperClient | None = None

if settings.keeper_email:
    keeper_client = KeeperClient(client_filter=settings.keeper_client_filter)
    logger.info(
        "Keeper client ready (cache-based, scope='%s', cache=%s)",
        settings.keeper_client_filter,
        "EXISTS" if _CACHE_FILE.exists() else "MISSING — run _keeper_refresh.py",
    )
else:
    logger.info("Keeper not configured (KEEPER_EMAIL empty)")
