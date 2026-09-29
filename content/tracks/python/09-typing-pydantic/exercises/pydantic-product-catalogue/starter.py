from collections.abc import Iterable
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class Product(BaseModel):
    sku: str
    name: str
    price: Decimal
    # stock, tags, and the rules


def load_catalogue(lines):
    """The valid products, and a "line N: location: message" string for every problem."""
    ...
