import re
import uuid

from fastapi import FastAPI, Request

VALID_ID = re.compile(r"[A-Za-z0-9-]{8,64}")

app = FastAPI()


# The request id middleware


@app.get("/orders/{order_id}")
def get_order(order_id: str, request: Request):
    return {"order_id": order_id, "request_id": getattr(request.state, "request_id", None)}


@app.get("/orders")
def list_orders(limit: int = 10):
    return []
