from collections.abc import Mapping

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class Settings(BaseModel):
    database_url: str
    api_key: str
    # debug, port, allowed_origins; frozen


def load_settings(environ, prefix="SHOP_"):
    """Settings from the environment variables that start with prefix."""
    ...
