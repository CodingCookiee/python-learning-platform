from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

orders: dict[str, dict] = {
    "A1042": {"order_id": "A1042", "customer": "Harbour Freight", "status": "shipped"},
    "A1043": {"order_id": "A1043", "customer": "Kiln Cafe", "status": "pending"},
}


class OrderCreate(BaseModel):
    order_id: str = Field(pattern=r"^A\d{4}$")
    customer: str = Field(min_length=1)


def find_order(order_id: str) -> dict:
    if order_id not in orders:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return orders[order_id]


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    return find_order(order_id)


@app.post("/orders", status_code=201)
def create_order(order: OrderCreate):
    if order.order_id in orders:
        raise HTTPException(status_code=409, detail=f"Order {order.order_id} already exists")
    orders[order.order_id] = {**order.model_dump(), "status": "pending"}
    return orders[order.order_id]


@app.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str):
    order = find_order(order_id)
    if order["status"] == "shipped":
        raise HTTPException(status_code=409, detail=f"Order {order_id} has shipped and can't be cancelled")
    order["status"] = "cancelled"
    return order
