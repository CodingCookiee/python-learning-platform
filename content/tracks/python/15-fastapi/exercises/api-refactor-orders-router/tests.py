import httpx

import solution
from plp import hidden, source_uses, test
from solution import app

KEY = {"X-API-Key": "ok-key-1"}


def client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


async def send(method, path, headers=None):
    async with client() as api:
        response = await api.request(method, path, headers=headers or {})
    return response.status_code, response.json()


@test("The invoice needs a key now; everything else behaves as before")
async def _():
    assert (await send("GET", "/orders/A1042/invoice"))[0] == 401
    assert await send("GET", "/orders/A1042", KEY) == (200, {"order_id": "A1042", "customer": "Kiln Cafe", "total_cents": 9600})
    assert await send("GET", "/health") == (200, {"status": "ok"})


@test("Every order route is protected")
async def _():
    assert [
        (await send(method, path))[0]
        for method, path in [("GET", "/orders"), ("GET", "/orders/A1042"), ("POST", "/orders/A1042/resend"), ("GET", "/orders/A1042/invoice")]
    ] == [401, 401, 401, 401]


@test("With a key, the routes answer as they did")
async def _():
    status, body = await send("GET", "/orders", KEY)
    assert (status, [order["order_id"] for order in body]) == (200, ["A1042", "A1043"])
    assert await send("POST", "/orders/A1043/resend", KEY) == (202, {"order_id": "A1043", "resent": True})
    assert await send("GET", "/orders/A1043/invoice", KEY) == (200, {"order_id": "A1043", "amount_due_cents": 2400})
    assert await send("GET", "/orders/A9999", KEY) == (404, {"detail": "Order A9999 not found"})


@test("The routes live on an APIRouter tagged orders")
def _():
    router = getattr(solution, "orders_router", None)
    assert router is not None and source_uses(call="include_router"), "Define orders_router and include it in app"
    assert (router.prefix, router.tags) == ("/orders", ["orders"])
    paths = app.openapi()["paths"]
    tags = {path: [operation.get("tags") for operation in paths[path].values()] for path in paths if path.startswith("/orders")}
    assert tags == {
        "/orders": [["orders"]],
        "/orders/{order_id}": [["orders"]],
        "/orders/{order_id}/resend": [["orders"]],
        "/orders/{order_id}/invoice": [["orders"]],
    }


@hidden("The key check is declared once, on the router")
def _():
    source = solution.solution_source() if hasattr(solution, "solution_source") else None
    from plp import solution_source

    assert solution_source().count("Depends(require_api_key)") == 1, (
        "Declare the API-key dependency once, on the router, not on each route"
    )
