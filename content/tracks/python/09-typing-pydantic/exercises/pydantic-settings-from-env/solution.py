from collections.abc import Mapping

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    database_url: str
    api_key: SecretStr
    debug: bool = False
    port: int = Field(default=8000, ge=1, le=65535)
    allowed_origins: list[str] = []

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


def load_settings(environ: Mapping[str, str], prefix: str = "SHOP_") -> Settings:
    """Settings from the environment variables that start with prefix."""
    values = {
        name.removeprefix(prefix).lower(): value
        for name, value in environ.items()
        if name.startswith(prefix)
    }
    return Settings.model_validate(values)
