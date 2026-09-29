import hashlib
import hmac

import fastapi  # noqa: F401  (imported here, untimed, so loading your service is quick)
import httpx
from plp import hidden, load_module, test

SECRET = "test-secret-forms"


def sign(body, timestamp=1773072000, secret=SECRET):
    signature = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"


def service():
    """A fresh copy of your file, with an empty `received` list."""
    return load_module("forms_webhook")


async def deliver(svc, body, header):
    headers = {"Content-Type": "application/json"}
    if header is not None:
        headers["Webhook-Signature"] = header
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=svc.app), base_url="http://test") as client:
        return await client.post("/webhooks/forms", content=body, headers=headers)


COMPACT = b'{"form":"contact","email":"amira@example.com","name":"Amira Haddad"}'


@test("Accepts compact JSON signed over its exact bytes")
async def _():
    svc = service()
    response = await deliver(svc, COMPACT, sign(COMPACT))
    assert response.status_code == 200
    assert svc.received == [{"form": "contact", "email": "amira@example.com", "name": "Amira Haddad"}]


@test("Accepts pretty-printed JSON with accents")
async def _():
    svc = service()
    body = '{\n  "form": "contact",\n  "name": "Zoë Martin"\n}'.encode()
    assert (await deliver(svc, body, sign(body))).status_code == 200
    assert svc.received == [{"form": "contact", "name": "Zoë Martin"}]


@test("Rejects a tampered body with 401 and stores nothing")
async def _():
    svc = service()
    tampered = COMPACT.replace(b"amira", b"mallory")
    assert (await deliver(svc, tampered, sign(COMPACT))).status_code == 401
    assert svc.received == []


@hidden("Rejects a missing signature with 401")
async def _():
    svc = service()
    assert (await deliver(svc, COMPACT, None)).status_code == 401
    assert svc.received == []


@hidden("A correctly signed body that isn't JSON gets 400")
async def _():
    svc = service()
    broken = b'{"form": "contact", "email": '
    assert (await deliver(svc, broken, sign(broken))).status_code == 400
    assert svc.received == []


@hidden("An unsigned request with invalid JSON is a 401, not a 400")
async def _():
    svc = service()
    assert (await deliver(svc, b"not json", "t=1,v1=00")).status_code == 401
