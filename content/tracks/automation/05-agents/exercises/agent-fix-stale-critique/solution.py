from dataclasses import dataclass

WRITER = "You write short, polite payment reminders for Brightline Bookkeeping."


@dataclass
class Refined:
    text: str
    rounds: int
    approved: bool


def critique_prompt(brief, draft):
    return (f"Check this payment reminder against the brief: polite, mentions the invoice number and "
            f"amount, no threats. Reply APPROVED, or list the problems.\n\nBrief: {brief}\n\nReminder:\n{draft}")


def revise_prompt(brief, draft, critique):
    return f"Revise this payment reminder to fix the problems.\n\nBrief: {brief}\n\nProblems:\n{critique}\n\nReminder:\n{draft}"


def ask(llm, content):
    return llm.complete([{"role": "user", "content": content}], system=WRITER).text.strip()


def refine(llm, brief, *, max_rounds=3):
    """Write a reminder, then critique and revise it until approved or out of rounds."""
    draft = ask(llm, f"Write a payment reminder. Brief: {brief}")
    for rounds in range(1, max_rounds + 1):
        verdict = ask(llm, critique_prompt(brief, draft))
        if verdict == "APPROVED":
            return Refined(draft, rounds, True)
        draft = ask(llm, revise_prompt(brief, draft, verdict))
    return Refined(draft, max_rounds, False)
