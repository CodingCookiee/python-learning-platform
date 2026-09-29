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
    model_config = ConfigDict(extra="forbid")

    category: Literal["billing", "shipping", "returns", "technical", "unknown"]
    confidence: float = Field(ge=0, le=1)
    reason: str


SYSTEM = (
    "Classify the support ticket between <ticket> tags into exactly one category:\n"
    + "\n".join(f"- {label}: {definition}" for label, definition in LABELS.items())
    + "\nGive your confidence from 0 to 1, and one sentence saying why."
)


def classify_ticket(llm, ticket: str) -> TicketLabel:
    """Classify one support ticket. Never raises on a bad reply."""
    response = llm.complete(
        [{"role": "user", "content": f"<ticket>\n{ticket}\n</ticket>"}],
        system=SYSTEM,
        schema=TicketLabel.model_json_schema(),
        temperature=0,
    )
    try:
        return TicketLabel.model_validate_json(response.text)
    except ValueError as error:
        return TicketLabel(category="unknown", confidence=0.0, reason=f"Unreadable reply: {error}")
