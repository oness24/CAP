from .crowdstrike import get_crowdstrike_dashboard
from .wazuh import get_wazuh_dashboard
from .safetica import get_safetica_dashboard
from .outpost24 import get_outpost24_dashboard
from .keeper import get_keeper_dashboard
from .zabbix import get_zabbix_dashboard

PLATFORM_DISPATCHERS = {
    "crowdstrike": get_crowdstrike_dashboard,
    "wazuh": get_wazuh_dashboard,
    "safetica": get_safetica_dashboard,
    "outpost24": get_outpost24_dashboard,
    "keeper": get_keeper_dashboard,
    "zabbix": get_zabbix_dashboard,
}


def get_platform_data(platform_id: str) -> dict:
    dispatcher = PLATFORM_DISPATCHERS.get(platform_id)
    if dispatcher is None:
        raise KeyError(f"Unknown platform: {platform_id}")
    return dispatcher()
