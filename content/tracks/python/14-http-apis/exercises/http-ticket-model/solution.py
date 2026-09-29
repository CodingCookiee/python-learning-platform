from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Ticket(BaseModel):
    id: int
    subject: str
    status: Literal["open", "pending", "closed"]
    priority: Literal["low", "normal", "high", "urgent"] = "normal"
    created_at: datetime
    assignee: str | None = None
    tags: list[str] = []


def parse_ticket(response):
    """The Ticket in an httpx.Response from the helpdesk API."""
    return Ticket.model_validate_json(response.content)
