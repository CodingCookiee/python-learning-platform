import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException

API_KEYS = {"pk_live_kiln_7f3a9c": "Kiln Cafe", "pk_live_harbour_2b81d4": "Harbour Freight"}
DELIVERIES = {
    "Kiln Cafe": [{"date": "2026-10-01", "sku": "BEANS-1KG", "quantity": 12}],
    "Harbour Freight": [{"date": "2026-10-02", "sku": "BEANS-1KG", "quantity": 40}],
}

app = FastAPI()


def current_partner():
    return "Kiln Cafe"


@app.get("/deliveries")
def list_deliveries(partner: Annotated[str, Depends(current_partner)]):
    return {"partner": partner, "deliveries": DELIVERIES[partner]}


@app.get("/health")
def health():
    return {"status": "ok"}
