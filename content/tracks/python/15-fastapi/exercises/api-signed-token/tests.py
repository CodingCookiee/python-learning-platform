import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime

import httpx

from plp import hidden, test
from solution import app, get_now, issue_token

EXPIRES = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)
BEFORE, AT_EXPIRY = datetime(2026, 10, 1, 11, 0, tzinfo=UTC), EXPIRES


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def payload_for(customer_id, expires_at=EXPIRES):
    return b64url(json.dumps({"sub": customer_id, "exp": int(expires_at.timestamp())}).encode())


async def me(authorization=None, now=BEFORE):
    """GET /me with the clock pinned at now; returns (status, JSON body, WWW-Authenticate header)."""
    app.dependency_overrides[get_now] = lambda: now
    headers = {} if authorization is None else {"Authorization": authorization}
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as api:
            response = await api.get("/me", headers=headers)
    finally:
        app.dependency_overrides.clear()
    return response.status_code, response.json(), response.headers.get("www-authenticate")


@test("A valid token, a forged one, and an expired one")
async def _():
    token = issue_token("cus_ada", EXPIRES)
    signature = token.split(".")[-1]
    forged = f"{payload_for('cus_grace')}.{signature}"
    assert (await me(f"Bearer {token}"))[:2] == (200, {"customer_id": "cus_ada"})
    assert (await me(f"Bearer {forged}"))[:2] == (401, {"detail": "Invalid token"})
    assert (await me(f"Bearer {token}", now=AT_EXPIRY))[:2] == (401, {"detail": "Token expired"})


@test("The token has the documented format")
def _():
    token = issue_token("cus_grace", EXPIRES)
    parts = token.split(".")
    assert len(parts) == 2, f"{token!r} should be <payload>.<signature>"
    assert json.loads(b64url_decode(parts[0])) == {"sub": "cus_grace", "exp": 1790856000}


@test("No token, or the wrong scheme")
async def _():
    token = issue_token("cus_ada", EXPIRES)
    assert (await me())[:2] == (401, {"detail": "Missing bearer token"})
    assert (await me(f"Basic {token}"))[:2] == (401, {"detail": "Missing bearer token"})
    assert (await me("Bearer"))[:2] == (401, {"detail": "Missing bearer token"})


@test("Every 401 says Bearer, and garbage doesn't crash anything")
async def _():
    assert (await me())[2] == "Bearer"
    assert await me("Bearer not-a-token") == (401, {"detail": "Invalid token"}, "Bearer")
    assert await me("Bearer a.b.c") == (401, {"detail": "Invalid token"}, "Bearer")


@hidden("A token signed with a different secret is refused, even if it's well formed")
async def _():
    payload = payload_for("cus_ada")
    other = b64url(hmac.new(b"someone-elses-secret", payload.encode(), hashlib.sha256).digest())
    assert (await me(f"Bearer {payload}.{other}"))[:2] == (401, {"detail": "Invalid token"})
    fresh = issue_token("cus_grace", datetime(2027, 1, 1, tzinfo=UTC))
    assert (await me(f"Bearer {fresh}", now=datetime(2026, 12, 31, 23, 59, tzinfo=UTC)))[:2] == (200, {"customer_id": "cus_grace"})
