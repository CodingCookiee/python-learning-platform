from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ShipmentUpdate(BaseModel):
    tracking_number: str
    carrier: str
    # status, estimated_delivery, signed_by, and the camelCase aliases


def parse_update(raw):
    """A ShipmentUpdate from the partner's camelCase JSON."""
    ...


def to_api(update):
    """camelCase JSON for the partner, without the fields that are None."""
    ...
