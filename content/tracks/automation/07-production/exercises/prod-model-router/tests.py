import json

from plp import hidden, raises, test
from plp_fakes import ScriptedLLM
from solution import ROUTER_SYSTEM, Routed, RoutingFailed, parse_reply, route


def reply(answer, confidence):
    return json.dumps({"answer": answer, "confidence": confidence})


@test("The small model answers the example on its own")
def _():
    llm = ScriptedLLM([reply("Refunds take 14 days.", 0.93)])
    assert route(llm, "How long do refunds take?") == Routed("Refunds take 14 days.", "model-small", False, False)
    assert [call["model"] for call in llm.calls] == ["model-small"]


@test("An unsure small model escalates to the large one")
def _():
    llm = ScriptedLLM([reply("Possibly?", 0.41), reply("Yes: Ireland, 3-5 working days.", 0.9)])
    assert route(llm, "Do you ship to Ireland?") == Routed("Yes: Ireland, 3-5 working days.", "model-large", True, False)
    assert [(c["model"], c["system"], c["temperature"]) for c in llm.calls] == [
        ("model-small", ROUTER_SYSTEM, 0),
        ("model-large", ROUTER_SYSTEM, 0),
    ]


@test("parse_reply accepts good replies and rejects the rest")
def _():
    assert parse_reply(reply("Refunds take 14 days.", 1)) == ("Refunds take 14 days.", 1.0)
    assert parse_reply("Refunds take 14 days.") is None
    assert parse_reply(reply("Refunds take 14 days.", 1.3)) is None
    assert parse_reply(reply("Refunds take 14 days.", "high")) is None
    assert parse_reply(reply("", 0.9)) is None


@test("When nobody is sure, the last answer goes to a person")
def _():
    llm = ScriptedLLM([reply("Maybe 10 days?", 0.3), reply("Probably 14 days.", 0.55)])
    assert route(llm, "How long do refunds take for gift cards?") == Routed("Probably 14 days.", "model-large", True, True)


@hidden("Unusable replies escalate, and all-unusable raises RoutingFailed")
def _():
    llm = ScriptedLLM(["Refunds take 14 days.", reply("Refunds take 14 days.", 0.8)])
    assert route(llm, "How long do refunds take?") == Routed("Refunds take 14 days.", "model-large", True, False)
    raises(RoutingFailed, route, ScriptedLLM(["I'm not sure.", "{}"]), "How long do refunds take?")
    assert parse_reply(reply("Yes.", True)) is None
    assert parse_reply("[1, 2]") is None


@hidden("A three-model chain stops at the first confident one, and the threshold is used")
def _():
    llm = ScriptedLLM([reply("Maybe.", 0.5), reply("Yes, 14 days.", 0.75), reply("never asked", 1)])
    assert route(llm, "Refund window?", models=("model-tiny", "model-small", "model-large")) == Routed("Yes, 14 days.", "model-small", True, False)
    assert len(llm.calls) == 2
    strict = ScriptedLLM([reply("Yes, 14 days.", 0.75), reply("Yes, 14 days.", 0.95)])
    assert route(strict, "Refund window?", threshold=0.9).model == "model-large"
