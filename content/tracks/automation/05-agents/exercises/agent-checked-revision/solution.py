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


def code_problems(text: str, invoice: dict) -> list[str]:
    """The problems code can find for free, in the order of the table."""
    problems = []
    if invoice["number"] not in text:
        problems.append(f"Mention the invoice number {invoice['number']}.")
    if invoice["amount"] not in text:
        problems.append(f"Mention the amount {invoice['amount']}.")
    words = len(text.split())
    if words > 120:
        problems.append(f"Keep it to 120 words; this draft has {words}.")
    lowered = text.lower()
    if "legal action" in lowered or "late fee" in lowered:
        problems.append("Don't mention legal action or late fees.")
    return problems


def ask(llm, content: str) -> str:
    return llm.complete([{"role": "user", "content": content}], system=WRITER).text.strip()


def critic_problems(verdict: str) -> list[str]:
    lines = (line.strip() for line in verdict.splitlines())
    return [line.removeprefix("- ").strip() for line in lines if line]


def write_reminder(llm, invoice: dict, *, max_rounds: int = 3) -> Drafted:
    """Draft, check in code, critique only clean drafts, and revise, for at most max_rounds rounds."""
    draft = ask(llm, write_prompt(invoice))
    for round_number in range(1, max_rounds + 1):
        problems = code_problems(draft, invoice)
        if not problems:
            verdict = ask(llm, critic_prompt(invoice, draft))
            if verdict == "APPROVED":
                return Drafted(draft, round_number, True, [])
            problems = critic_problems(verdict)
        if round_number == max_rounds:
            return Drafted(draft, round_number, False, problems)
        draft = ask(llm, revise_prompt(invoice, draft, problems))
    raise AssertionError("unreachable")
