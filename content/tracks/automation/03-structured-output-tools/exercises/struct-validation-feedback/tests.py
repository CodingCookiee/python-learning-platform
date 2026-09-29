from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, ValidationError, model_validator

from plp import hidden, test
from solution import validation_feedback


class Invoice(BaseModel):
    invoice_number: str = Field(min_length=1)
    total: Decimal = Field(gt=0)
    currency: Literal["EUR", "GBP", "USD"]


class Line(BaseModel):
    sku: str
    quantity: int = Field(gt=0)


class Order(BaseModel):
    order_id: str
    lines: list[Line]
    paid: Decimal
    total: Decimal

    @model_validator(mode="after")
    def paid_in_full(self):
        if self.paid != self.total:
            raise ValueError("paid must equal total")
        return self


def error_for(model, data):
    try:
        model.model_validate(data)
    except ValidationError as error:
        return error
    raise AssertionError(f"The test expected {data!r} to be invalid")


@test("Describes the example's two problems, one per line")
def _():
    error = error_for(Invoice, {"invoice_number": "INV-2291", "total": -40, "currency": "YEN"})
    assert validation_feedback(error) == (
        "total: Input should be greater than 0\n"
        "currency: Input should be 'EUR', 'GBP' or 'USD'"
    )


@test("Names missing fields")
def _():
    error = error_for(Invoice, {"total": 10, "currency": "EUR"})
    assert validation_feedback(error) == "invoice_number: Field required"


@test("Joins nested locations with dots")
def _():
    error = error_for(Order, {"order_id": "A1042", "lines": [{"sku": "MUG", "quantity": 0}], "paid": 8, "total": 8})
    assert validation_feedback(error) == "lines.0.quantity: Input should be greater than 0"


@hidden("Writes (root) for a problem with the whole object")
def _():
    error = error_for(Order, {"order_id": "A1042", "lines": [], "paid": 5, "total": 8})
    assert validation_feedback(error) == "(root): Value error, paid must equal total"
    assert validation_feedback(error_for(Invoice, ["not", "an", "object"])) == (
        "(root): Input should be a valid dictionary or instance of Invoice"
    )
