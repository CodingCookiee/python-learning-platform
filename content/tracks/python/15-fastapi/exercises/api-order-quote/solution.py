from fastapi import FastAPI
from pydantic import BaseModel, Field


class QuoteRequest(BaseModel):
    sku: str = Field(min_length=1)
    quantity: int = Field(ge=1, le=99)
    unit_price_cents: int = Field(gt=0)


app = FastAPI()


@app.post("/quotes")
def quote(request: QuoteRequest):
    return {
        "sku": request.sku,
        "quantity": request.quantity,
        "total_cents": request.quantity * request.unit_price_cents,
    }
