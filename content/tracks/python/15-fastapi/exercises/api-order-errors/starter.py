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


@app.get("/orders/{order_id}")
def get_order(order_id: str):
    return orders[order_id]


@app.post("/orders")
def create_order(order: OrderCreate):
    orders[order.order_id] = {**order.model_dump(), "status": "pending"}
    return orders[order.order_id]


@app.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str):
    orders[order_id]["status"] = "cancelled"
    return orders[order_id]
