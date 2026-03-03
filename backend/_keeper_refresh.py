"""
Keeper data fetcher for CLUB ATHLETICO PAULISTANO (managed company).
Run this script interactively to refresh Keeper data (requires 2FA via SMS).
Saves results to .keeper_cache.json for the backend to consume.

Usage:
    cd backend
    python _keeper_refresh.py
"""
import json
import os
import sys
from datetime import datetime, timezone

from keepercommander.params import KeeperParams
from keepercommander import api
from keepercommander.commands.enterprise import UserReportCommand
from keepercommander.commands.security_audit import SecurityAuditReportCommand

MC_ID = 212488
MC_NAME = "CLUB ATHLETICO PAULISTANO"
CACHE_PATH = os.path.join(os.path.dirname(__file__), ".keeper_cache.json")

print("=== Keeper Data Refresh ===")
print(f"Target: {MC_NAME} (mc_id={MC_ID})")
print("Logging in as MSP admin (2FA via SMS will be required)...\n")

p = KeeperParams()
p.user = "onesmus.simiyu@contego.com.br"
p.password = "oby@2025Skillset"
api.login(p)
if not p.session_token:
    print("LOGIN FAILED")
    sys.exit(1)
print("\nLogin OK!")

api.query_enterprise(p)
if not p.enterprise:
    print("NOT ENTERPRISE")
    sys.exit(1)

# Switch to the managed company context
print(f"\nSwitching to managed company '{MC_NAME}' ...")
mc_params = api.login_and_get_mc_params_login_v3(p, MC_ID)
if not mc_params.session_token:
    print("MC LOGIN FAILED")
    sys.exit(1)

api.query_enterprise(mc_params)
mc_users_count = len(mc_params.enterprise.get("users", [])) if mc_params.enterprise else 0
print(f"MC context ready — {mc_users_count} enterprise users")

# Fetch reports inside the MC context
print("Fetching security audit report...")
audit_cmd = SecurityAuditReportCommand()
audit_raw = audit_cmd.execute(mc_params, format="json")
audit_rows = json.loads(audit_raw) if audit_raw else []

print("Fetching user report...")
user_cmd = UserReportCommand()
user_raw = user_cmd.execute(mc_params, format="json")
user_rows = json.loads(user_raw) if user_raw else []

# Save cache
cache = {
    "fetched_at": datetime.now(tz=timezone.utc).isoformat(),
    "mc_id": MC_ID,
    "mc_name": MC_NAME,
    "enterprise_name": mc_params.enterprise.get("enterprise_name", "") if mc_params.enterprise else "",
    "user_report": user_rows,
    "security_audit": audit_rows,
}

with open(CACHE_PATH, "w", encoding="utf-8") as f:
    json.dump(cache, f, indent=2, default=str)

print(f"\nSaved {len(user_rows)} users + {len(audit_rows)} audit rows to {CACHE_PATH}")
print("Done! The backend will use this cached data.")
