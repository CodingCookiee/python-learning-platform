import asyncio
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException

app = FastAPI()
KEYS = {
    "key-ada": {"customer": "ada", "scopes": {"read"}},
    "key-kiln": {"customer": "kiln", "scopes": {"read", "write"}},
}
ORDERS = {"A1042": "kiln", "A1043": "ada"}


def current_key(x_api_key: Annotated[str | None, Header()] = None) -> dict:
    if x_api_key not in KEYS:
        raise HTTPException(401, "Missing or invalid API key")
    return KEYS[x_api_key]


def require_write(key: Annotated[dict, Depends(current_key)]) -> None:
    if "write" not in key["scopes"]:
        raise HTTPException(403, "This key is read-only")


@app.get("/orders/{order_id}")
def get_order(order_id: str, key: Annotated[dict, Depends(current_key)]):
    if ORDERS.get(order_id) != key["customer"]:
        raise HTTPException(404, "Order not found")
    return {"order_id": order_id}


@app.delete("/orders/{order_id}", status_code=204, dependencies=[Depends(require_write)])
def delete_order(order_id: str, key: Annotated[dict, Depends(current_key)]):
    if ORDERS.get(order_id) != key["customer"]:
        raise HTTPException(404, "Order not found")


async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        requests = [
            ("GET", "A1043", None),
            ("GET", "A1043", "key-ada"),
            ("GET", "A1042", "key-ada"),
            ("GET", "A1042", "key-nope"),
            ("DELETE", "A1043", "key-ada"),
            ("DELETE", "A1042", "key-kiln"),
            ("DELETE", "A1043", "key-kiln"),
            ("DELETE", "A1042", None),
        ]
        for method, order_id, key in requests:
            headers = {} if key is None else {"X-API-Key": key}
            response = await client.request(method, f"/orders/{order_id}", headers=headers)
            print(method, order_id, key, response.status_code)


asyncio.run(main())
