from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException

API_KEYS = {"ok-key-1", "ok-key-2"}
ORDERS = {
    "A1042": {"order_id": "A1042", "customer": "Kiln Cafe", "total_cents": 9600},
    "A1043": {"order_id": "A1043", "customer": "Harbour Freight", "total_cents": 2400},
}

app = FastAPI()


def require_api_key(x_api_key: Annotated[str | None, Header()] = None) -> None:
    if x_api_key not in API_KEYS:
        raise HTTPException(401, "Missing or invalid API key", headers={"WWW-Authenticate": "ApiKey"})


def find_order(order_id: str) -> dict:
    if order_id not in ORDERS:
        raise HTTPException(404, f"Order {order_id} not found")
    return ORDERS[order_id]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/orders", dependencies=[Depends(require_api_key)])
def list_orders():
    return list(ORDERS.values())


@app.get("/orders/{order_id}", dependencies=[Depends(require_api_key)])
def get_order(order_id: str):
    return find_order(order_id)


@app.post("/orders/{order_id}/resend", status_code=202, dependencies=[Depends(require_api_key)])
def resend_confirmation(order_id: str):
    find_order(order_id)
    return {"order_id": order_id, "resent": True}


@app.get("/orders/{order_id}/invoice")
def get_invoice(order_id: str):
    order = find_order(order_id)
    return {"order_id": order_id, "amount_due_cents": order["total_cents"]}
