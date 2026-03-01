from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.config import settings
from main import app


def _mock_user() -> User:
    user = User()
    user.id = 1
    user.email = "test@capdash.io"
    user.name = "Test User"
    user.role = "admin"
    user.is_active = True
    return user


class DummyCrowdStrikeClient:
    def fetch_dashboard(self, mock_base: dict) -> dict:
        data = dict(mock_base)
        data["_live"] = True
        data.setdefault("kpis", {})
        return data

    def fetch_devices_page(self, page: int, limit: int, platform: str, device_type: str, search: str) -> dict:
        return {
            "total": 1,
            "page": page,
            "limit": limit,
            "items": [
                {
                    "id": "dev-1",
                    "hostname": "host-1",
                    "status": "Online",
                }
            ],
        }

    def fetch_alerts_page(self, page: int, limit: int, severity: str, status: str) -> dict:
        return {
            "total": 1,
            "page": page,
            "limit": limit,
            "items": [{"id": "alert-1", "severity": "High", "status": "New"}],
        }

    def fetch_incidents_page(self, page: int, limit: int) -> dict:
        return {"total": 0, "page": page, "limit": limit, "items": []}


class DummyZabbixClient:
    _group_ids = ["21"]

    def is_scope_unavailable(self) -> bool:
        return False

    def fetch_dashboard(self, mock_base: dict) -> dict:
        data = dict(mock_base)
        data["_live"] = True
        data.setdefault("kpis", {})
        return data

    def get_triggers_page(self, page: int, limit: int, severity: str) -> dict:
        return {
            "total": 1,
            "page": page,
            "limit": limit,
            "items": [{"id": "trig-1", "severity": "High", "host": "srv-1"}],
        }

    def get_hosts_page(self, page: int, limit: int, search: str) -> dict:
        return {
            "total": 1,
            "page": page,
            "limit": limit,
            "items": [{"id": "host-1", "host": "srv-1", "status": "Up"}],
        }


def _client() -> TestClient:
    app.dependency_overrides[get_current_user] = _mock_user
    return TestClient(app)


def test_debug_zabbix_hidden_in_production(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")

    with TestClient(app) as client:
        response = client.get("/_debug/zabbix")

    assert response.status_code == 404


def test_debug_zabbix_available_in_test(monkeypatch):
    monkeypatch.setattr(settings, "environment", "test")

    with TestClient(app) as client:
        response = client.get("/_debug/zabbix")

    assert response.status_code == 200
    payload = response.json()
    assert "client_created" in payload


def test_crowdstrike_endpoints_with_mocked_client(monkeypatch):
    import app.integrations.crowdstrike as crowdstrike_module

    monkeypatch.setattr(settings, "crowdstrike_client_id", "dummy-client-id")
    monkeypatch.setattr(crowdstrike_module, "cs_client", DummyCrowdStrikeClient())

    with _client() as client:
        dashboard = client.get("/api/v1/platforms/crowdstrike/dashboard")
        devices = client.get("/api/v1/platforms/crowdstrike/devices?page=1&limit=5")
        detections = client.get("/api/v1/platforms/crowdstrike/detections?page=1&limit=5")

    assert dashboard.status_code == 200
    assert dashboard.json()["data"]["_live"] is True

    assert devices.status_code == 200
    assert devices.json()["total"] == 1
    assert devices.json()["platform_id"] == "crowdstrike"

    assert detections.status_code == 200
    assert detections.json()["total"] == 1
    assert detections.json()["platform_id"] == "crowdstrike"


def test_zabbix_endpoints_with_mocked_client(monkeypatch):
    import app.integrations.zabbix as zabbix_module

    monkeypatch.setattr(settings, "zabbix_url", "https://zabbix.local")
    monkeypatch.setattr(settings, "zabbix_api_token", "dummy-token")
    monkeypatch.setattr(zabbix_module, "zabbix_client", DummyZabbixClient())

    with _client() as client:
        dashboard = client.get("/api/v1/platforms/zabbix/dashboard")
        triggers = client.get("/api/v1/platforms/zabbix/triggers?page=1&limit=5")
        hosts = client.get("/api/v1/platforms/zabbix/hosts?page=1&limit=5")

    assert dashboard.status_code == 200
    assert dashboard.json()["data"]["_live"] is True

    assert triggers.status_code == 200
    assert triggers.json()["total"] == 1
    assert triggers.json()["platform_id"] == "zabbix"

    assert hosts.status_code == 200
    assert hosts.json()["total"] == 1
    assert hosts.json()["platform_id"] == "zabbix"


def test_zabbix_hosts_returns_503_when_scope_unavailable(monkeypatch):
    import app.integrations.zabbix as zabbix_module

    class ScopeUnavailableClient(DummyZabbixClient):
        def is_scope_unavailable(self) -> bool:
            return True

    monkeypatch.setattr(zabbix_module, "zabbix_client", ScopeUnavailableClient())

    with _client() as client:
        response = client.get("/api/v1/platforms/zabbix/hosts?page=1&limit=5")

    assert response.status_code == 503
    assert "CAP scope unavailable" in response.json()["detail"]


def test_zabbix_triggers_returns_503_when_api_down(monkeypatch):
    import app.integrations.zabbix as zabbix_module

    class ApiDownClient(DummyZabbixClient):
        def get_triggers_page(self, page: int, limit: int, severity: str) -> dict:
            raise RuntimeError("zabbix unavailable")

    monkeypatch.setattr(zabbix_module, "zabbix_client", ApiDownClient())

    with _client() as client:
        response = client.get("/api/v1/platforms/zabbix/triggers?page=1&limit=5")

    assert response.status_code == 503
    assert response.json()["detail"] == "CAP scope unavailable or Zabbix API is down."


def test_zabbix_dashboard_returns_empty_payload_when_unconfigured(monkeypatch):
    import app.integrations.zabbix as zabbix_module

    monkeypatch.setattr(settings, "zabbix_url", "")
    monkeypatch.setattr(settings, "zabbix_api_token", "")
    monkeypatch.setattr(zabbix_module, "zabbix_client", None)

    with _client() as client:
        response = client.get("/api/v1/platforms/zabbix/dashboard")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["_live"] is False
    assert data["kpis"]["totalHosts"]["value"] == 0
