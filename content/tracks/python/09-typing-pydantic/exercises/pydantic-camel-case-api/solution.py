from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ShipmentUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, validate_by_name=True, validate_by_alias=True)

    tracking_number: str
    carrier: str
    status: Literal["label_created", "in_transit", "delivered"]
    estimated_delivery: date | None = None
    signed_by: str | None = None


def parse_update(raw: str) -> ShipmentUpdate:
    """A ShipmentUpdate from the partner's camelCase JSON."""
    return ShipmentUpdate.model_validate_json(raw)


def to_api(update: ShipmentUpdate) -> str:
    """camelCase JSON for the partner, without the fields that are None."""
    return update.model_dump_json(by_alias=True, exclude_none=True)
