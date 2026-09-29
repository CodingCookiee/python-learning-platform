from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Ticket(BaseModel):
    id: int
    subject: str


def parse_ticket(response):
    """The Ticket in an httpx.Response from the helpdesk API."""
    ...
