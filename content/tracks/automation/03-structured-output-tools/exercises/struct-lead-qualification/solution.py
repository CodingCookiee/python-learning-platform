from pydantic import BaseModel, ConfigDict

SYSTEM = """Extract facts about the sales lead in the email between <email> tags.
Use null for anything the email doesn't say. Never guess a number."""


class LeadFacts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company: str
    seats: int | None
    monthly_budget_usd: int | None
    start_within_days: int | None
    wants_demo: bool


def qualify(facts: LeadFacts) -> str:
    """Sales' rules: "hot", "warm" or "cold"."""
    if (
        facts.wants_demo
        and facts.seats is not None and facts.seats >= 20
        and facts.start_within_days is not None and facts.start_within_days <= 90
    ):
        return "hot"
    if facts.wants_demo or (facts.seats or 0) >= 5 or (facts.monthly_budget_usd or 0) >= 500:
        return "warm"
    return "cold"


def qualify_lead(llm, email: str) -> tuple[LeadFacts, str]:
    """Extract the lead's facts with the model, then score them in code."""
    response = llm.complete(
        [{"role": "user", "content": f"<email>\n{email}\n</email>"}],
        system=SYSTEM,
        schema=LeadFacts.model_json_schema(),
        temperature=0,
    )
    facts = LeadFacts.model_validate_json(response.text)
    return facts, qualify(facts)
