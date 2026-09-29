from typing import Literal

from pydantic import BaseModel, Field


class Ticket(BaseModel):
    """A customer support ticket, triaged."""

    category: Literal["billing", "shipping", "technical"]
    urgent: bool = Field(description="The customer can't use the product at all")
    order_id: str | None = None
    tags: list[str] = []


schema = Ticket.model_json_schema()

print(schema["description"])
print(schema["required"])
print(schema["properties"]["category"]["enum"])
print(schema["properties"]["urgent"]["description"])
print(schema["properties"]["order_id"]["anyOf"])
print(schema["properties"]["tags"]["items"])
print("additionalProperties" in schema)
