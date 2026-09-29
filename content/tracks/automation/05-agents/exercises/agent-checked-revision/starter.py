from dataclasses import dataclass, field

WRITER = "You write short, polite payment reminders for Brightline Bookkeeping. Sign them 'Brightline Accounts'."


@dataclass
class Drafted:
    text: str
    rounds: int
    approved: bool
    problems: list[str] = field(default_factory=list)


def facts(invoice):
    return f"invoice {invoice['number']} to {invoice['client']}, {invoice['amount']}, {invoice['days_overdue']} days overdue"


def write_prompt(invoice):
    return f"Write a payment reminder for {facts(invoice)}."


def critic_prompt(invoice, draft):
    return (f"Review this payment reminder for {facts(invoice)}. Is it polite, clear and specific? "
            f"Reply APPROVED, or list the problems, one per line.\n\n{draft}")


def revise_prompt(invoice, draft, problems):
    listed = "\n".join(f"- {p}" for p in problems)
    return f"Revise this payment reminder for {facts(invoice)}.\n\nProblems:\n{listed}\n\nReminder:\n{draft}"


def code_problems(text, invoice):
    """The problems code can find for free, in the order of the table."""
    ...


def write_reminder(llm, invoice, *, max_rounds=3):
    """Draft, check in code, critique only clean drafts, and revise, for at most max_rounds rounds."""
    ...
