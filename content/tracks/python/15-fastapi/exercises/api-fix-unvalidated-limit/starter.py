from typing import Annotated, Literal

from fastapi import FastAPI, Query

STATUSES = ["pending", "packed", "shipped"]
ORDERS = [{"id": f"A{1000 + n}", "status": STATUSES[n % 3]} for n in range(1, 301)]

app = FastAPI()


@app.get("/orders")
def list_orders(page: int = 1, per_page: int = 20, status: str | None = None):
    orders = ORDERS if status is None else [order for order in ORDERS if order["status"] == status]
    start = (page - 1) * per_page
    return {"page": page, "orders": orders[start:start + per_page]}
