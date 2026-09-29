from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class Refund(BaseModel):
    order_id: str = Field(alias="orderId")
    amount: Decimal
    requested_on: date
    note: str | None = None


refund = Refund.model_validate({"orderId": "A1042", "amount": "12.50", "requested_on": "2026-09-29"})

print(refund.order_id)
print(refund.model_dump())
print(refund.model_dump(mode="json"))
print(refund.model_dump(mode="json", by_alias=True, exclude_none=True))
print(refund.model_dump_json(exclude={"note"}))
