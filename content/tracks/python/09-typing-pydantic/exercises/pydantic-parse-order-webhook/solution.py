from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, ValidationError


class Customer(BaseModel):
    email: str
    name: str


class LineItem(BaseModel):
    sku: str
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(gt=0, decimal_places=2)


class OrderCreated(BaseModel):
    order_id: str
    placed_at: datetime
    currency: Literal["GBP", "EUR", "USD"]
    customer: Customer
    lines: list[LineItem] = Field(min_length=1)

    @property
    def total(self) -> Decimal:
        return sum((line.unit_price * line.quantity for line in self.lines), Decimal("0"))


def parse_order(raw: str) -> OrderCreated:
    """Parse and validate an order.created webhook body."""
    return OrderCreated.model_validate_json(raw)


def error_summary(raw: str) -> list[str]:
    """One "location: message" line per problem in the body, or [] if it's valid."""
    try:
        OrderCreated.model_validate_json(raw)
    except ValidationError as error:
        return [
            f"{'.'.join(str(part) for part in problem['loc']) or '(body)'}: {problem['msg']}"
            for problem in error.errors()
        ]
    return []
