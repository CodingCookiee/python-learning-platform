import copy

from plp import hidden, test
from solution import to_anthropic, to_openai

SCHEMA = {"type": "object", "properties": {"day": {"type": "string"}}, "required": ["day"]}
FIND_SLOTS = {
    "name": "find_slots",
    "description": "Find free appointment slots for a practitioner on a given day.",
    "parameters": SCHEMA,
}
BOOK = {
    "name": "book_appointment",
    "description": "Book a free slot for a patient.",
    "parameters": {"type": "object", "properties": {"start": {"type": "string"}, "email": {"type": "string"}},
                   "required": ["start", "email"]},
}


@test("Translates the example for both providers")
def _():
    assert to_anthropic(FIND_SLOTS) == {
        "name": "find_slots",
        "description": "Find free appointment slots for a practitioner on a given day.",
        "input_schema": SCHEMA,
    }
    assert to_openai(FIND_SLOTS) == {
        "type": "function",
        "function": {
            "name": "find_slots",
            "description": "Find free appointment slots for a practitioner on a given day.",
            "parameters": SCHEMA,
        },
    }


@test("Leaves the neutral tool unchanged")
def _():
    before = copy.deepcopy(BOOK)
    to_anthropic(BOOK)
    to_openai(BOOK)
    assert BOOK == before


@test("Translates a whole tool list")
def _():
    assert [tool["name"] for tool in map(to_anthropic, [FIND_SLOTS, BOOK])] == ["find_slots", "book_appointment"]
    assert [tool["function"]["name"] for tool in map(to_openai, [FIND_SLOTS, BOOK])] == ["find_slots", "book_appointment"]


@hidden("Doesn't carry the neutral keys across")
def _():
    assert set(to_anthropic(BOOK)) == {"name", "description", "input_schema"}
    assert set(to_openai(BOOK)) == {"type", "function"}
    assert set(to_openai(BOOK)["function"]) == {"name", "description", "parameters"}
