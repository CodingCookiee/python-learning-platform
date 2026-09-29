import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException

SECRET = b"tidewater-demo-secret"  # in production, from settings; never in the code

app = FastAPI()


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def sign(payload: str) -> bytes:
    return hmac.new(SECRET, payload.encode(), hashlib.sha256).digest()


def get_now() -> datetime:
    return datetime.now(UTC)


def issue_token(customer_id: str, expires_at: datetime) -> str:
    """A signed token: <payload>.<signature>."""
    ...


def current_customer() -> str:
    """The customer id from a valid, unexpired bearer token."""
    ...


@app.get("/me")
def me(customer_id: Annotated[str, Depends(current_customer)]):
    return {"customer_id": customer_id}
