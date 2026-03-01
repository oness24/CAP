from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


_BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = "sqlite:///./capdash.db"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:5173"
    environment: str = "development"

    # CrowdStrike Falcon API
    crowdstrike_client_id: str = ""
    crowdstrike_client_secret: str = ""
    crowdstrike_base_url: str = "https://api.us-2.crowdstrike.com"

    # Zabbix API
    zabbix_url: str = ""
    zabbix_api_token: str = ""
    zabbix_group: str = ""  # filter all queries to this host group name

    # Outpost24 Outscan API
    outpost24_url: str = ""
    outpost24_username: str = ""
    outpost24_password: str = ""

    # SIEM — Wazuh (OpenSearch Dashboard)
    wazuh_dashboard_url: str = ""
    wazuh_username: str = ""
    wazuh_password: str = ""
    wazuh_api_id: str = "default"
    wazuh_group: str = "CAP"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
