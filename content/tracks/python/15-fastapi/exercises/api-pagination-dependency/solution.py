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


def pagination(
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> Page:
    return Page(offset, limit)


type PageParams = Annotated[Page, Depends(pagination)]


@app.get("/customers")
def list_customers(page: PageParams):
    return {"total": len(CUSTOMERS), "items": CUSTOMERS[page.offset:page.offset + page.limit]}


@app.get("/invoices")
def list_invoices(page: PageParams):
    return {"total": len(INVOICES), "items": INVOICES[page.offset:page.offset + page.limit]}
