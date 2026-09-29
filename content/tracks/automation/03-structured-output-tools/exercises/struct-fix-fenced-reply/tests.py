import json

from plp import hidden, raises, test
from solution import parse_reply

FENCE = "`" * 3
LEAD = {"company": "Northwind", "seats": 40}


@test("Parses a plain reply and a reply fenced as json")
def _():
    assert parse_reply('{"company": "Northwind", "seats": 40}') == LEAD
    assert parse_reply(FENCE + 'json\n{"company": "Northwind", "seats": 40}\n' + FENCE) == LEAD


@test("Parses a fence with no language tag")
def _():
    assert parse_reply(FENCE + '\n{"company": "Northwind", "seats": 40}\n' + FENCE) == LEAD


@test("Ignores whitespace around the reply and inside the fence")
def _():
    reply = "\n\n  " + FENCE + 'json\n\n  {"company": "Northwind", "seats": 40}  \n\n' + FENCE + "\n "
    assert parse_reply(reply) == LEAD


@test("Still refuses text that isn't JSON")
def _():
    raises(json.JSONDecodeError, parse_reply, "Sorry, I couldn't find a company in that email.")


@hidden("Accepts JSON in capitals as the fence tag, and fenced arrays")
def _():
    assert parse_reply(FENCE + 'JSON\n{"company": "Northwind", "seats": 40}\n' + FENCE) == LEAD
    assert parse_reply(FENCE + 'json\n[{"sku": "SEAT"}]\n' + FENCE) == [{"sku": "SEAT"}]


@hidden("Keeps backticks that are inside a JSON string")
def _():
    reply = FENCE + 'json\n{"note": "run `make sync`"}\n' + FENCE
    assert parse_reply(reply) == {"note": "run `make sync`"}
