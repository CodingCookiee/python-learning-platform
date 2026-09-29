import asyncio

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()
orders = {"A1042": {"status": "shipped"}}


class NewOrder(BaseModel):
    order_id: str
    quantity: int = Field(gt=0)


@app.post("/orders", status_code=201)
def create_order(order: NewOrder):
    if order.order_id in orders:
        raise HTTPException(409, f"{order.order_id} already exists")
    orders[order.order_id] = {"status": "pending"}
    return {"order_id": order.order_id}


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    if order_id not in orders:
        raise HTTPException(404, "No such order")
    return orders[order_id]


@app.delete("/orders/{order_id}", status_code=204)
def delete_order(order_id: str):
    if orders.get(order_id, {}).get("status") == "shipped":
        raise HTTPException(409, "Already shipped")
    orders.pop(order_id, None)


async def main():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        requests = [
            ("POST", "/orders", {"order_id": "A1043", "quantity": 2}),
            ("POST", "/orders", {"order_id": "A1043", "quantity": 1}),
            ("POST", "/orders", {"order_id": "A1042", "quantity": 0}),
            ("GET", "/orders/A1044", None),
            ("DELETE", "/orders/A1042", None),
            ("DELETE", "/orders/A1043", None),
            ("DELETE", "/orders/A1043", None),
            ("PUT", "/orders/A1042", None),
            ("GET", "/orders/A1043", None),
        ]
        for method, path, body in requests:
            response = await client.request(method, path, json=body)
            print(method, path, response.status_code)


asyncio.run(main())
