from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

login = client.post("/api/v1/auth/login", json={"email": "admin@capdash.io", "password": "Admin@123"})
print("login", login.status_code)

if login.status_code != 200:
    print("login_body", login.text)
    raise SystemExit(1)

headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

hosts = client.get("/api/v1/platforms/zabbix/hosts", params={"page": 1, "limit": 5}, headers=headers)
print("zabbix_hosts", hosts.status_code, hosts.json().get("total"), len(hosts.json().get("items", [])))

triggers = client.get("/api/v1/platforms/zabbix/triggers", params={"page": 1, "limit": 5}, headers=headers)
print("zabbix_triggers", triggers.status_code, triggers.json().get("total"), len(triggers.json().get("items", [])))
