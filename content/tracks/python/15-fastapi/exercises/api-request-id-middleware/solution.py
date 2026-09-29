import re
import uuid

from fastapi import FastAPI, Request

VALID_ID = re.compile(r"[A-Za-z0-9-]{8,64}")

app = FastAPI()


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    incoming = request.headers.get("X-Request-ID", "")
    request_id = incoming if VALID_ID.fullmatch(incoming) else uuid.uuid4().hex
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/orders/{order_id}")
def get_order(order_id: str, request: Request):
    return {"order_id": order_id, "request_id": getattr(request.state, "request_id", None)}


@app.get("/orders")
def list_orders(limit: int = 10):
    return []
