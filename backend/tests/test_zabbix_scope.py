from app.integrations.zabbix import ZabbixClient


class UnresolvedGroupClient(ZabbixClient):
    def _call(self, method, params):
        if method == "hostgroup.get":
            return []
        raise AssertionError(f"Unexpected unscoped call: {method}")


class ScopedClient(ZabbixClient):
    def __init__(self):
        self.calls: list[tuple[str, dict]] = []
        super().__init__("https://zabbix.local", "token", group_name="CAP")

    def _call(self, method, params):
        self.calls.append((method, params))

        if method == "hostgroup.get":
            if params.get("filter", {}).get("name") == ["CAP"]:
                return [{"groupid": "21", "name": "CAP"}]
            return []

        if method == "host.get":
            # scoped-host-id lookup + hosts page
            return [{"hostid": "1001", "host": "cap-host", "name": "CAP Host", "interfaces": [], "groups": []}]

        if method == "trigger.get":
            return [{"triggerid": "5001", "description": "CPU high", "priority": "4", "lastchange": "0", "hosts": [{"hostid": "1001", "host": "cap-host", "name": "CAP Host"}]}]

        if method == "problem.get":
            return []

        return []


def test_fail_closed_when_group_not_resolved():
    client = UnresolvedGroupClient("https://zabbix.local", "token", group_name="CAP")

    hosts_page = client.get_hosts_page(page=1, limit=10)
    triggers_page = client.get_triggers_page(page=1, limit=10)
    dashboard = client.fetch_dashboard(mock_fallback={"kpis": {"totalHosts": {"value": 999}}})

    assert hosts_page["total"] == 0
    assert hosts_page["items"] == []
    assert triggers_page["total"] == 0
    assert triggers_page["items"] == []
    assert dashboard["_live"] is False
    assert dashboard["kpis"]["totalHosts"]["value"] == 0


def test_triggers_query_is_host_scoped_for_cap_group():
    client = ScopedClient()

    page = client.get_triggers_page(page=1, limit=10)

    assert page["total"] == 1
    trigger_calls = [params for method, params in client.calls if method == "trigger.get"]
    assert trigger_calls, "Expected trigger.get to be called"
    assert "hostids" in trigger_calls[0]
    assert trigger_calls[0]["hostids"] == ["1001"]
