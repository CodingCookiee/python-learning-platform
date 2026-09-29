import json

from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import BATCH_SYSTEM, classify_batch

TICKETS = {"T-101": "Where is my parcel?", "T-102": "Card declined twice", "T-103": "App crashes on login"}


def sent_batch(call):
    """The ticket array a call sent, parsed back out of its <tickets> tags."""
    content = call["messages"][0]["content"]
    assert content.startswith("<tickets>\n") and content.endswith("\n</tickets>"), (
        f"The message should be the JSON array between <tickets> tags, each on its own line, got {content!r}"
    )
    return json.loads(content.removeprefix("<tickets>\n").removesuffix("\n</tickets>"))


def results(*pairs):
    return json.dumps({"results": [{"id": ticket_id, "category": category} for ticket_id, category in pairs]})


@test("Classifies the example in two batches")
def _():
    llm = ScriptedLLM([results(("T-101", "shipping"), ("T-102", "billing")), results(("T-103", "technical"))])
    assert classify_batch(llm, TICKETS, batch_size=2) == {"T-101": "shipping", "T-102": "billing", "T-103": "technical"}
    assert len(llm.calls) == 2


@test("Each call sends only its batch, as JSON between tags")
def _():
    llm = ScriptedLLM([results(("T-101", "shipping"), ("T-102", "billing")), results(("T-103", "technical"))])
    classify_batch(llm, TICKETS, batch_size=2)
    assert sent_batch(llm.calls[0]) == [
        {"id": "T-101", "text": "Where is my parcel?"},
        {"id": "T-102", "text": "Card declined twice"},
    ]
    assert sent_batch(llm.calls[1]) == [{"id": "T-103", "text": "App crashes on login"}]
    assert [call["system"] for call in llm.calls] == [BATCH_SYSTEM, BATCH_SYSTEM]
    assert [call["temperature"] for call in llm.calls] == [0, 0]


@test("A ticket missing from the reply is unknown")
def _():
    llm = ScriptedLLM([results(("T-101", "shipping"), ("T-103", "technical"))])
    assert classify_batch(llm, TICKETS) == {"T-101": "shipping", "T-102": "unknown", "T-103": "technical"}


@test("One invalid result costs one ticket, and invented ids are ignored")
def _():
    llm = ScriptedLLM([results(("T-101", "Shipping issue"), ("T-102", "billing"), ("T-103", "technical"), ("T-999", "billing"))])
    assert classify_batch(llm, TICKETS) == {"T-101": "unknown", "T-102": "billing", "T-103": "technical"}


@test("A reply with no JSON makes its batch unknown, and the next batch still runs")
def _():
    llm = ScriptedLLM(["Sorry, I can't classify these.", results(("T-103", "technical"))])
    assert classify_batch(llm, TICKETS, batch_size=2) == {"T-101": "unknown", "T-102": "unknown", "T-103": "technical"}


@hidden("Uses batches of 20 by default, and keeps the tickets' order")
def _():
    many = {f"T-{n}": f"Ticket number {n}" for n in range(300, 275, -1)}
    ids = list(many)
    llm = ScriptedLLM([results(*[(i, "returns") for i in reversed(ids[:20])]), results(*[(i, "billing") for i in ids[20:]])])
    answer = classify_batch(llm, many)
    assert len(llm.calls) == 2
    assert [len(sent_batch(call)) for call in llm.calls] == [20, 5]
    assert list(answer) == ids
    assert set(answer.values()) == {"returns", "billing"}


@hidden("Ids from another batch don't overwrite results")
def _():
    llm = ScriptedLLM([results(("T-101", "shipping"), ("T-102", "billing")),
                       results(("T-103", "technical"), ("T-101", "returns"))])
    assert classify_batch(llm, TICKETS, batch_size=2)["T-101"] == "shipping"
