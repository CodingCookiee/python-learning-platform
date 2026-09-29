from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

# Customer, LineItem and OrderCreated models


def parse_order(raw):
    """Parse and validate an order.created webhook body."""
    ...


def error_summary(raw):
    """One "location: message" line per problem in the body, or [] if it's valid."""
    ...
