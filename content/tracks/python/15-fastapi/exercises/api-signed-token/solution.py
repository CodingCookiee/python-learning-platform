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
    claims = {"sub": customer_id, "exp": int(expires_at.timestamp())}
    payload = b64url(json.dumps(claims).encode())
    return f"{payload}.{b64url(sign(payload))}"


def unauthorized(detail: str) -> HTTPException:
    return HTTPException(401, detail, headers={"WWW-Authenticate": "Bearer"})


def current_customer(
    now: Annotated[datetime, Depends(get_now)],
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """The customer id from a valid, unexpired bearer token."""
    scheme, _, token = (authorization or "").partition(" ")
    if scheme != "Bearer" or not token:
        raise unauthorized("Missing bearer token")

    parts = token.split(".")
    if len(parts) != 2 or not hmac.compare_digest(parts[1], b64url(sign(parts[0]))):
        raise unauthorized("Invalid token")

    claims = json.loads(b64url_decode(parts[0]))
    if claims["exp"] <= now.timestamp():
        raise unauthorized("Token expired")
    return claims["sub"]


@app.get("/me")
def me(customer_id: Annotated[str, Depends(current_customer)]):
    return {"customer_id": customer_id}
