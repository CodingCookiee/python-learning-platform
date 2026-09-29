import json

from pydantic import ValidationError

from plp import hidden, raises, test
from plp_fakes import ScriptedLLM
from solution import LeadFacts, qualify, qualify_lead

EMAIL = "We're Northwind, 40 people, want to switch in two months. Demo?"
NORTHWIND = {"company": "Northwind", "seats": 40, "monthly_budget_usd": None, "start_within_days": 60, "wants_demo": True}


def facts(**changes):
    return LeadFacts(**{**NORTHWIND, **changes})


@test("Qualifies the example lead as hot")
def _():
    llm = ScriptedLLM([json.dumps(NORTHWIND)])
    lead, score = qualify_lead(llm, EMAIL)
    assert lead.seats == 40
    assert score == "hot"


@test("Asks the model for facts only, with a strict schema")
def _():
    llm = ScriptedLLM([json.dumps(NORTHWIND)])
    qualify_lead(llm, EMAIL)
    call = llm.calls[0]
    assert call["messages"] == [{"role": "user", "content": f"<email>\n{EMAIL}\n</email>"}]
    assert call["temperature"] == 0
    schema = call.get("schema") or {}
    assert schema.get("required") == ["company", "seats", "monthly_budget_usd", "start_within_days", "wants_demo"]
    assert schema.get("additionalProperties") is False


@test("Hot needs a demo, 20 seats and a start within 90 days")
def _():
    assert qualify(facts(seats=20, start_within_days=90)) == "hot"
    assert qualify(facts(seats=19)) == "warm"
    assert qualify(facts(start_within_days=91)) == "warm"
    assert qualify(facts(wants_demo=False)) == "warm"


@test("Unknown facts never make a lead hot")
def _():
    assert qualify(facts(seats=None)) == "warm"
    assert qualify(facts(start_within_days=None)) == "warm"


@test("Warm and cold")
def _():
    base = dict(seats=None, monthly_budget_usd=None, start_within_days=None, wants_demo=False)
    assert qualify(facts(**base)) == "cold"
    assert qualify(facts(**{**base, "seats": 5})) == "warm"
    assert qualify(facts(**{**base, "seats": 4})) == "cold"
    assert qualify(facts(**{**base, "monthly_budget_usd": 500})) == "warm"
    assert qualify(facts(**{**base, "monthly_budget_usd": 499})) == "cold"
    assert qualify(facts(**{**base, "wants_demo": True})) == "warm"


@hidden("Refuses a reply with extra fields, such as a score of its own")
def _():
    llm = ScriptedLLM([json.dumps({**NORTHWIND, "score": "hot"})])
    raises(ValidationError, qualify_lead, llm, EMAIL)


@hidden("A small cafe with nothing but a question is cold")
def _():
    reply = {"company": "Kiln Cafe", "seats": 2, "monthly_budget_usd": None, "start_within_days": None, "wants_demo": False}
    lead, score = qualify_lead(ScriptedLLM([json.dumps(reply)]), "Do you integrate with Square?")
    assert (lead.company, score) == ("Kiln Cafe", "cold")
