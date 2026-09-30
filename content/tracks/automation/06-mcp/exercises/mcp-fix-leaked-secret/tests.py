import json
import os
import secrets

from plp import hidden, test
from plp_fakes import McpHarness
import solution
from solution import handle

TOKEN = "shpat_" + secrets.token_hex(12)
os.environ["KILN_SHOP_TOKEN"] = TOKEN
ORIGINAL_FETCH = solution.fetch


def connected():
    return McpHarness(handle, protocol="2026-07-28")


def leaked(client, token=TOKEN):
    return token in json.dumps(client.log)


@test("shop_info leaves the token out")
def _():
    client = connected()
    assert client.call_tool("shop_info")["content"][0]["text"] == (
        '{"shop": "kiln-and-co", "api_url": "https://kiln-and-co.shop.example/admin/api", "currency": "GBP"}')
    assert not leaked(client)


@test("A sync timeout reports the URL, which no longer holds the token")
def _():
    os.environ["KILN_SHOP_TOKEN"] = TOKEN
    solution.fetch = ORIGINAL_FETCH
    client = connected()
    assert client.call_tool("sync_status") == {"resultType": "complete", "content": [{"type": "text", "text":
        "Timed out after 10s fetching https://kiln-and-co.shop.example/admin/api/sync"}], "isError": True}
    assert not leaked(client)


@test("The token travels in the Authorization header")
def _():
    os.environ["KILN_SHOP_TOKEN"] = TOKEN
    seen = []

    def fake_fetch(url, headers=None):
        seen.append((url, headers))
        return {"last_sync": "2026-09-29T06:00:00Z", "ok": True}

    solution.fetch = fake_fetch
    try:
        result = connected().call_tool("sync_status")
    finally:
        solution.fetch = ORIGINAL_FETCH
    assert seen == [("https://kiln-and-co.shop.example/admin/api/sync", {"Authorization": f"Bearer {TOKEN}"})]
    assert json.loads(result["content"][0]["text"]) == {"last_sync": "2026-09-29T06:00:00Z", "ok": True}


@hidden("Any error or result that mentions the token is redacted")
def _():
    os.environ["KILN_SHOP_TOKEN"] = TOKEN

    def rejecting_fetch(url, headers=None):
        raise PermissionError(f"401 Unauthorized for {url} with headers {headers}")

    solution.fetch = rejecting_fetch
    try:
        client = connected()
        result = client.call_tool("sync_status")
    finally:
        solution.fetch = ORIGINAL_FETCH
    assert result["isError"] is True
    assert "Bearer [redacted]" in result["content"][0]["text"]
    assert not leaked(client)


@hidden("The token is read when the call happens, so a rotated token is redacted too")
def _():
    rotated = "shpat_" + secrets.token_hex(12)
    os.environ["KILN_SHOP_TOKEN"] = rotated

    def echoing_fetch(url, headers=None):
        return {"debug": headers}

    solution.fetch = echoing_fetch
    try:
        client = connected()
        text = client.call_tool("sync_status")["content"][0]["text"]
    finally:
        solution.fetch = ORIGINAL_FETCH
        os.environ["KILN_SHOP_TOKEN"] = TOKEN
    assert json.loads(text) == {"debug": {"Authorization": "Bearer [redacted]"}}
    assert not leaked(client, rotated)
