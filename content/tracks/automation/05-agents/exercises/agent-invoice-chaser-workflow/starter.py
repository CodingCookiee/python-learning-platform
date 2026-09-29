from dataclasses import dataclass

WRITER_SYSTEM = (
    "You write short payment reminders for Brightline Bookkeeping's clients. Three sentences at most, "
    "polite and specific, signed 'Brightline Accounts'. Never threaten legal action or invent late fees."
)


@dataclass
class Action:
    kind: str                 # "wait" | "email" | "escalate"
    tone: str | None = None   # "friendly" | "firm" for an email
    text: str | None = None   # the email, for an email


def chase_invoice(llm, invoice, *, today):
    """Decide what to do about one invoice; only an email needs the model."""
    ...
