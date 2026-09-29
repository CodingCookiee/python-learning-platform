from pydantic import BaseModel, ConfigDict

SYSTEM = """Extract facts about the sales lead in the email between <email> tags.
Use null for anything the email doesn't say. Never guess a number."""


class LeadFacts(BaseModel):
    company: str
    # seats, monthly_budget_usd, start_within_days, wants_demo


def qualify(facts):
    """Sales' rules: "hot", "warm" or "cold"."""
    ...


def qualify_lead(llm, email):
    """Extract the lead's facts with the model, then score them in code."""
    ...
