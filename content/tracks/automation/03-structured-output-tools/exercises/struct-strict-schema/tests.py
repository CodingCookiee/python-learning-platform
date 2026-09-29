import copy
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from plp import hidden, raises, test
from solution import strict_schema


class Ticket(BaseModel):
    category: Literal["billing", "shipping"]
    order_id: str | None = None


class Line(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float


class Address(BaseModel):
    city: str
    postcode: str | None = None


class Invoice(BaseModel):
    """A supplier invoice."""
    invoice_number: str
    due_date: date | None = None
    lines: list[Line]
    billing_address: Address | None = None
    notes: str = Field(default="", description="Anything else on the invoice")


class Tagged(BaseModel):
    order_id: str
    counts: dict[str, int]


@test("Makes the example ticket strict")
def _():
    strict = strict_schema(Ticket.model_json_schema())
    assert strict["required"] == ["category", "order_id"]
    assert strict["additionalProperties"] is False
    assert strict["properties"]["order_id"] == {
        "anyOf": [{"type": "string"}, {"type": "null"}], "default": None, "title": "Order Id",
    }


@test("Leaves the rest of the schema alone")
def _():
    original = Ticket.model_json_schema()
    strict = strict_schema(original)
    assert strict["properties"]["category"] == original["properties"]["category"]
    assert strict["title"] == "Ticket"
    assert strict["type"] == "object"


@test("Doesn't change the schema it was given")
def _():
    original = Invoice.model_json_schema()
    before = copy.deepcopy(original)
    strict_schema(original)
    assert original == before


@test("Makes nested models in $defs strict too")
def _():
    strict = strict_schema(Invoice.model_json_schema())
    line = strict["$defs"]["Line"]
    assert line["required"] == ["description", "quantity", "unit_price"]
    assert line["additionalProperties"] is False
    assert strict["$defs"]["Address"]["required"] == ["city", "postcode"]
    assert strict["required"] == ["invoice_number", "due_date", "lines", "billing_address", "notes"]


@hidden("Keeps $ref, anyOf, items and descriptions intact")
def _():
    original = Invoice.model_json_schema()
    strict = strict_schema(original)
    assert strict["properties"]["lines"] == original["properties"]["lines"]
    assert strict["properties"]["billing_address"] == original["properties"]["billing_address"]
    assert strict["description"] == "A supplier invoice."
    assert strict["properties"]["notes"]["description"] == "Anything else on the invoice"


@hidden("Refuses a free-form dict field")
def _():
    raises(ValueError, strict_schema, Tagged.model_json_schema(), match="free-form object")


@hidden("Handles a hand-written schema with an object inside an array")
def _():
    schema = {
        "type": "object",
        "properties": {"tickets": {"type": "array", "items": {"type": "object", "properties": {"id": {"type": "string"}}}}},
    }
    strict = strict_schema(schema)
    assert strict["properties"]["tickets"]["items"] == {
        "type": "object", "properties": {"id": {"type": "string"}}, "additionalProperties": False, "required": ["id"],
    }
