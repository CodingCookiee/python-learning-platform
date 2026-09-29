from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, FastAPI, Query

CUSTOMERS = [{"id": n, "name": f"Customer {n}"} for n in range(1, 24)]
INVOICES = [{"number": f"INV-{n:04d}"} for n in range(1, 58)]

app = FastAPI()


@dataclass
class Page:
    offset: int
    limit: int


def pagination():
    ...


@app.get("/customers")
def list_customers():
    return {"total": len(CUSTOMERS), "items": CUSTOMERS}


@app.get("/invoices")
def list_invoices():
    return {"total": len(INVOICES), "items": INVOICES}
