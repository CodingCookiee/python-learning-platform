import httpx

from plp import hidden, test
from solution import app, orders


def client():
    # A crash in the app comes back as a 500, as a real client would see it
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    return httpx.AsyncClient(transport=transport, base_url="http://test")


def reset():
    orders.clear()
    orders["A1042"] = {"order_id": "A1042", "customer": "Harbour Freight", "status": "shipped"}
    orders["A1043"] = {"order_id": "A1043", "customer": "Kiln Cafe", "status": "pending"}


async def send(method, path, body=None):
    """One request; returns (status code, JSON body)."""
    async with client() as api:
        response = await api.request(method, path, json=body)
    try:
        return response.status_code, response.json()
    except ValueError:
        return response.status_code, response.text


@test("The three examples from the prompt")
async def _():
    reset()
    assert await send("GET", "/orders/A1099") == (404, {"detail": "Order A1099 not found"})
    assert await send("POST", "/orders/A1042/cancel") == (409, {"detail": "Order A1042 has shipped and can't be cancelled"})
    assert await send("POST", "/orders/A1043/cancel") == (200, {"order_id": "A1043", "customer": "Kiln Cafe", "status": "cancelled"})


@test("Creating an order answers 201, and a taken id answers 409")
async def _():
    reset()
    assert await send("POST", "/orders", {"order_id": "A2001", "customer": "Tidewater Tours"}) == (
        201,
        {"order_id": "A2001", "customer": "Tidewater Tours", "status": "pending"},
    )
    assert await send("POST", "/orders", {"order_id": "A1042", "customer": "Someone else"}) == (
        409,
        {"detail": "Order A1042 already exists"},
    )
    assert orders["A1042"]["customer"] == "Harbour Freight"


@test("Cancelling a missing order is a 404, and a shipped order stays shipped")
async def _():
    reset()
    assert await send("POST", "/orders/A1099/cancel") == (404, {"detail": "Order A1099 not found"})
    await send("POST", "/orders/A1042/cancel")
    assert orders["A1042"]["status"] == "shipped"


@test("Cancelling twice isn't an error")
async def _():
    reset()
    await send("POST", "/orders/A1043/cancel")
    assert await send("POST", "/orders/A1043/cancel") == (200, {"order_id": "A1043", "customer": "Kiln Cafe", "status": "cancelled"})


@hidden("Found orders are returned, and malformed ids are a 422")
async def _():
    reset()
    assert await send("GET", "/orders/A1042") == (200, {"order_id": "A1042", "customer": "Harbour Freight", "status": "shipped"})
    status, _ = await send("POST", "/orders", {"order_id": "1044", "customer": "Kiln Cafe"})
    assert status == 422
