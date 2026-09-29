from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import HANDLERS, ROUTER_SYSTEM, Routed, route_ticket

TICKET = "I was charged twice for September!"
REPLY = "Sorry about the double charge on INV-2291. I've flagged it for a refund review."


@test("Routes the example to billing")
def _():
    llm = ScriptedLLM(["Billing", REPLY])
    assert route_ticket(llm, TICKET) == Routed("billing", REPLY)
    assert len(llm.calls) == 2


@test("The classifier call is deterministic and short, with the ticket in tags")
def _():
    llm = ScriptedLLM(["billing", REPLY])
    route_ticket(llm, TICKET)
    first = llm.calls[0]
    assert first["system"] == ROUTER_SYSTEM
    assert (first["temperature"], first["max_tokens"]) == (0, 5)
    assert first["messages"] == [{"role": "user", "content": f"<ticket>\n{TICKET}\n</ticket>"}]


@test("The handler gets its own system prompt and the ticket")
def _():
    llm = ScriptedLLM([" Technical.\n", "Could you send the error message you see?"])
    assert route_ticket(llm, "The CSV export fails with an error.") == Routed("technical", "Could you send the error message you see?")
    assert llm.calls[1]["system"] == HANDLERS["technical"]
    assert llm.calls[1]["messages"] == [{"role": "user", "content": "The CSV export fails with an error."}]


@test("An unexpected label goes to a person, with no second call")
def _():
    llm = ScriptedLLM(["refund"])
    assert route_ticket(llm, TICKET) == Routed("human", None)
    assert len(llm.calls) == 1


@hidden("Sales works too, and a chatty label isn't trusted")
def _():
    assert route_ticket(ScriptedLLM(["SALES", "Our team plan is 12 per seat."]), "What does a team plan cost?") == Routed(
        "sales", "Our team plan is 12 per seat.")
    assert route_ticket(ScriptedLLM(["I think this is billing"]), TICKET) == Routed("human", None)
