from collections.abc import Mapping
from typing import overload


@overload
def get_setting(env: Mapping[str, str], name: str) -> str | None: ...
@overload
def get_setting(env: Mapping[str, str], name: str, default: str) -> str: ...
@overload
def get_setting(env: Mapping[str, str], name: str, default: int) -> int: ...
def get_setting(
    env: Mapping[str, str], name: str, default: str | int | None = None
) -> str | int | None:
    """A setting from env: as text, or as an int when the default is an int."""
    raw = env.get(name)
    if raw is None:
        return default
    if isinstance(default, int):
        try:
            return int(raw)
        except ValueError:
            raise ValueError(f"{name} must be a whole number, got {raw!r}") from None
    return raw
