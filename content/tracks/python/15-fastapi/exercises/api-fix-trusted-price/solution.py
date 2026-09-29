from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

CATALOGUE = {"BEANS-1KG": 2400, "MUG-01": 800, "V60-100": 450}  # cents per unit
CUSTOMERS_BY_KEY = {"ck_kiln_51f0": "kiln-cafe", "ck_harbour_9a2e": "harbour-freight"}

app = FastAPI()
orders: list[dict] = []


def current_customer(x_api_key: Annotated[str | None, Header()] = None) -> str:
    if x_api_key not in CUSTOMERS_BY_KEY:
        raise HTTPException(401, "Missing or invalid API key", headers={"WWW-Authenticate": "ApiKey"})
    return CUSTOMERS_BY_KEY[x_api_key]


class OrderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku: str
    quantity: int = Field(ge=1, le=100)


@app.post("/orders", status_code=201)
def place_order(order: OrderCreate, customer: Annotated[str, Depends(current_customer)]):
    if order.sku not in CATALOGUE:
        raise HTTPException(422, f"Unknown SKU: {order.sku}")
    record = {
        "id": len(orders) + 1,
        "customer_id": customer,
        "sku": order.sku,
        "quantity": order.quantity,
        "total_cents": order.quantity * CATALOGUE[order.sku],
    }
    orders.append(record)
    return record
