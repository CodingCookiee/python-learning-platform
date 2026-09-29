import re

import httpx

from plp import hidden, test
from solution import app

NEW_ID = re.compile(r"[0-9a-f]{32}")


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def get(path, request_id=None):
    """GET path; returns (status, X-Request-ID response header, JSON body)."""
    headers = {} if request_id is None else {"X-Request-ID": request_id}
    async with client() as api:
        response = await api.get(path, headers=headers)
    return response.status_code, response.headers.get("x-request-id"), response.json()


@test("Keeps a good id, makes one when there's none, and replaces a bad one")
async def _():
    assert await get("/orders/A1042", "lb-7f3a9c21") == (200, "lb-7f3a9c21", {"order_id": "A1042", "request_id": "lb-7f3a9c21"})
    status, header, body = await get("/orders/A1042")
    assert NEW_ID.fullmatch(header or ""), f"expected a new uuid4().hex id, got {header!r}"
    assert body["request_id"] == header
    status, header, _ = await get("/nowhere", "<script>")
    assert (status, bool(NEW_ID.fullmatch(header or ""))) == (404, True)


@test("Every request without an id gets a different one")
async def _():
    first = (await get("/orders/A1042"))[1]
    second = (await get("/orders/A1042"))[1]
    assert first != second


@test("Validation errors carry the id too")
async def _():
    status, header, _ = await get("/orders?limit=many", "checkout-svc-0042")
    assert (status, header) == (422, "checkout-svc-0042")


@hidden("Ids that are too short or too long are replaced")
async def _():
    assert NEW_ID.fullmatch((await get("/orders/A1", "abc-123"))[1] or "")
    assert (await get("/orders/A1", "a" * 64))[1] == "a" * 64
    assert NEW_ID.fullmatch((await get("/orders/A1", "a" * 65))[1] or "")
