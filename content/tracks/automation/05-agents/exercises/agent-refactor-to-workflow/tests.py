import json

import solution
from plp import hidden, raises, source_avoids, test
from plp_fakes import ScriptedLLM
from solution import SYSTEM, weekly_summary

SUMMARY = "Harbour Dental: 2 open tickets (1 urgent), 1 unpaid invoice of 1,450.00. Call them this week."


@test("Writes the example summary with one model call")
def _():
    llm = ScriptedLLM([SUMMARY])
    assert weekly_summary(llm, "A-17") == SUMMARY
    assert len(llm.calls) == 1


@test("The call offers no tools and keeps the system prompt")
def _():
    llm = ScriptedLLM([SUMMARY])
    weekly_summary(llm, "A-17")
    assert llm.calls[0]["tools"] in (None, [])
    assert llm.calls[0]["system"] == SYSTEM


@test("One user message: the task line, then all three results as JSON")
def _():
    llm = ScriptedLLM([SUMMARY])
    weekly_summary(llm, "A-17")
    messages = llm.calls[0]["messages"]
    assert [m["role"] for m in messages] == ["user"]
    content = messages[0]["content"]
    assert content.startswith("Write this week's summary for account A-17.")
    for part in [solution.get_account("A-17"), solution.get_open_tickets("A-17"), solution.get_unpaid_invoices("A-17")]:
        assert json.dumps(part) in content, f"The message should include {json.dumps(part)}"


@test("No loop over tool calls is left")
def _():
    assert source_avoids(name="tool_calls"), "The workflow never reads response.tool_calls"
    assert source_avoids(name="REGISTRY"), "Call the three functions directly; the registry can go"


@hidden("An unknown account fails before any model call")
def _():
    raises(KeyError, weekly_summary, ScriptedLLM([]), "A-99")


@hidden("Uses the account it was given")
def _():
    solution.ACCOUNTS["A-22"] = {"id": "A-22", "name": "Kiln & Co", "plan": "starter", "owner": "Sam"}
    llm = ScriptedLLM(["Kiln & Co: one open ticket, nothing unpaid."])
    assert weekly_summary(llm, "A-22") == "Kiln & Co: one open ticket, nothing unpaid."
    content = llm.calls[0]["messages"][0]["content"]
    assert "T-902" in content and "T-881" not in content and "Kiln & Co" in content
