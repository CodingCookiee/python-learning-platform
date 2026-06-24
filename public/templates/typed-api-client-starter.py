# Type-Safe API Client - Starter Template

"""Starter scaffold for a fully type-hinted API client using Pydantic."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Generic, TypeVar
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    from pydantic import BaseModel, Field
except ImportError:  # pragma: no cover - starter fallback for minimal environments
    class BaseModel:  # type: ignore[too-many-ancestors]
        """Minimal fallback base model for environments without Pydantic."""

        @classmethod
        def model_validate(cls, data: dict[str, Any]) -> Any:
            return cls(**data)  # type: ignore[misc]

    def Field(default: Any = None, **_: Any) -> Any:  # type: ignore[no-redef]
        return default


T = TypeVar("T", bound=BaseModel)


class APIClientError(RuntimeError):
    """Raised when the remote API returns an error response."""


class User(BaseModel):
    """Example response model."""

    model_config = {"extra": "ignore"}

    id: int
    name: str
    email: str = Field(default="")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic API response container."""

    model_config = {"extra": "ignore"}

    items: list[T]
    total: int


@dataclass(slots=True)
class ClientConfig:
    """Connection settings for the API client."""

    base_url: str
    api_key: str
    timeout_seconds: float = 30.0


def validate_model(model_cls: type[T], data: dict[str, Any]) -> T:
    """Validate data with Pydantic v2, Pydantic v1, or the local fallback."""

    validator = getattr(model_cls, "model_validate", None)
    if callable(validator):
        return validator(data)

    parser = getattr(model_cls, "parse_obj", None)
    if callable(parser):
        return parser(data)

    return model_cls(**data)


class TypeSafeAPIClient:
    """A small, type-safe client that validates JSON payloads."""

    def __init__(self, config: ClientConfig):
        self.config = config

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """Perform an HTTP request and decode the JSON response."""

        url = f"{self.config.base_url.rstrip('/')}/{path.lstrip('/')}"
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "TypeSafeAPIClient/1.0",
        }

        body = None if payload is None else json.dumps(payload).encode("utf-8")
        request = Request(url, data=body, headers=headers, method=method.upper())

        try:
            with urlopen(request, timeout=self.config.timeout_seconds) as response:
                raw = response.read().decode("utf-8")
        except HTTPError as exc:
            raise APIClientError(f"HTTP {exc.code} while calling {path}") from exc
        except URLError as exc:
            raise APIClientError(f"Network error while calling {path}: {exc.reason}") from exc

        return json.loads(raw) if raw else {}

    def get_user(self, user_id: int) -> User:
        """Fetch and validate a single user record."""

        data = self._request("GET", f"users/{user_id}")
        return validate_model(User, data)

    def list_users(self) -> PaginatedResponse[User]:
        """Fetch and validate a paginated list of users."""

        data = self._request("GET", "users")
        items = [validate_model(User, item) for item in data.get("items", [])]
        total = int(data.get("total", len(items)))
        return PaginatedResponse[User](items=items, total=total)

    def create_user(self, name: str, email: str) -> User:
        """Create a new user with validated request and response models."""

        payload = {"name": name, "email": email}
        data = self._request("POST", "users", payload)
        return validate_model(User, data)


def print_starter_guide() -> None:
    """Show the main implementation checkpoints."""

    steps = [
        "Define request and response models with Pydantic.",
        "Add strict type hints to every public method.",
        "Handle API and network errors explicitly.",
        "Validate JSON responses before returning them.",
        "Add retries, pagination, and auth refresh if needed.",
    ]

    print("=== Type-Safe API Client Starter ===")
    for step in steps:
        print(f"- {step}")


def main() -> None:
    """Run the starter guide."""

    print_starter_guide()


if __name__ == "__main__":
    main()
