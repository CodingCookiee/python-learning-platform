from plp import hidden, raises, test
from solution import extract_json

FENCE = "`" * 3
LEAD = {"company": "Northwind", "seats": 40, "contact": {"name": "Ada Park"}}


@test("Finds the object in a fenced reply with prose around it")
def _():
    reply = (
        "Sure! Here is the lead:\n" + FENCE + "json\n"
        '{"company": "Northwind", "seats": 40, "contact": {"name": "Ada Park"}}\n'
        + FENCE + "\nLet me know if you need anything else."
    )
    assert extract_json(reply) == LEAD


@test("Returns a bare object unchanged")
def _():
    assert extract_json('{"company": "Northwind", "wants_demo": true}') == {"company": "Northwind", "wants_demo": True}


@test("Ignores a preamble and a trailing note")
def _():
    reply = 'Here you go: {"company": "Acme Dental", "seats": 12}\n\nNote: seats was approximate.'
    assert extract_json(reply) == {"company": "Acme Dental", "seats": 12}


@test("Isn't fooled by braces inside strings")
def _():
    reply = '{"company": "Northwind", "note": "they use {curly} braces"} (as requested, with a closing } here)'
    assert extract_json(reply) == {"company": "Northwind", "note": "they use {curly} braces"}


@test("Raises ValueError when there's no JSON object")
def _():
    raises(ValueError, extract_json, "I couldn't find a company in that email.", match="No JSON object found in the reply")


@hidden("Skips a stray brace in the prose before the real object")
def _():
    reply = 'The fields {as you asked}: {"company": "Acme Dental", "seats": null}'
    assert extract_json(reply) == {"company": "Acme Dental", "seats": None}


@hidden("Refuses arrays, broken objects and empty replies")
def _():
    raises(ValueError, extract_json, "[1, 2, 3]", match="No JSON object")
    raises(ValueError, extract_json, '{"company": "Northw', match="No JSON object")
    raises(ValueError, extract_json, "", match="No JSON object")
