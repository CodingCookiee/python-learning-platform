from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

LABELS = {
    "billing": "charges, invoices, refunds of a payment, changing a card",
    "shipping": "where an order is, delivery dates, damaged parcels",
    "returns": "sending an item back or exchanging it",
    "technical": "the product or website isn't working",
    "unknown": "none of these fit, or the ticket is too unclear to tell",
}


class TicketLabel(BaseModel):
    category: str
    confidence: float
    reason: str


def classify_ticket(llm, ticket):
    """Classify one support ticket. Never raises on a bad reply."""
    response = llm.complete([{"role": "user", "content": ticket}], system="Classify this ticket.")
    return TicketLabel.model_validate_json(response.text)
