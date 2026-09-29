from datetime import date
from decimal import Decimal

from plp import hidden, test
from plp_fakes import LLMResponse, ToolCall
from solution import assistant_message, tool_result

FIND = ToolCall("call_01", "find_slots", {"practitioner": "Patel"})


@test("Builds the example's two messages")
def _():
    response = LLMResponse(text="", tool_calls=[FIND], stop_reason="tool_use")
    assert assistant_message(response) == {
        "role": "assistant",
        "content": "",
        "tool_calls": [{"id": "call_01", "name": "find_slots", "arguments": {"practitioner": "Patel"}}],
    }
    assert tool_result(FIND, ["14:30", "16:00"]) == {"role": "tool", "tool_call_id": "call_01", "content": '["14:30", "16:00"]'}


@test("A plain answer has no tool_calls key")
def _():
    response = LLMResponse(text="You're booked for 14:30.", stop_reason="end_turn")
    assert assistant_message(response) == {"role": "assistant", "content": "You're booked for 14:30."}


@test("Keeps several tool calls, in order, with the text that came with them")
def _():
    second = ToolCall("call_02", "find_slots", {"practitioner": "Okafor"})
    response = LLMResponse(text="Checking both diaries.", tool_calls=[FIND, second], stop_reason="tool_use")
    message = assistant_message(response)
    assert message["content"] == "Checking both diaries."
    assert [call["id"] for call in message["tool_calls"]] == ["call_01", "call_02"]


@test("A string result goes in as it is; anything else as JSON")
def _():
    assert tool_result(FIND, "No slots on Thursday.")["content"] == "No slots on Thursday."
    assert tool_result(FIND, {"booking_id": "BK-5521", "confirmed": True, "room": None})["content"] == (
        '{"booking_id": "BK-5521", "confirmed": true, "room": null}'
    )


@hidden("Dates and Decimals become strings instead of raising")
def _():
    output = {"day": date(2026, 10, 1), "price": Decimal("45.00")}
    assert tool_result(FIND, output)["content"] == '{"day": "2026-10-01", "price": "45.00"}'
    assert tool_result(FIND, [])["content"] == "[]"
