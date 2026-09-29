from dataclasses import dataclass
from datetime import date

WRITER_SYSTEM = (
    "You write short payment reminders for Brightline Bookkeeping's clients. Three sentences at most, "
    "polite and specific, signed 'Brightline Accounts'. Never threaten legal action or invent late fees."
)


@dataclass
class Action:
    kind: str                 # "wait" | "email" | "escalate"
    tone: str | None = None   # "friendly" | "firm" for an email
    text: str | None = None   # the email, for an email


def chase_invoice(llm, invoice: dict, *, today: date) -> Action:
    """Decide what to do about one invoice; only an email needs the model."""
    days = (today - invoice["due"]).days
    if days < 3:
        return Action("wait")
    if days >= 30:
        return Action("escalate")
    tone = "friendly" if days < 14 else "firm"
    prompt = (
        f"Write a {tone} payment reminder for this invoice.\n"
        f"<invoice>\nnumber: {invoice['number']}\nclient: {invoice['client']}\n"
        f"amount: {invoice['amount']}\n{days} days overdue\ntone: {tone}\n</invoice>"
    )
    response = llm.complete([{"role": "user", "content": prompt}], system=WRITER_SYSTEM, max_tokens=300)
    return Action("email", tone, response.text.strip())
