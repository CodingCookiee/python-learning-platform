import json
from decimal import Decimal

from pydantic import BaseModel, Field

from plp import hidden, raises, test
from plp_fakes import Reply, ScriptedLLM, tool_call
from solution import StepLimitExceeded, Tool, run_agent

ORDERS = {
    "1042": {"order_id": "1042", "status": "shipped", "total": Decimal("48.50")},
    "1043": {"order_id": "1043", "status": "packing", "total": Decimal("12.00")},
}
REFUNDS = []


class GetOrder(BaseModel):
    order_id: str = Field(pattern=r"^\d{4}$", description="Four-digit order number, e.g. 1042")


class RefundOrder(BaseModel):
    order_id: str = Field(pattern=r"^\d{4}$")
    amount: Decimal = Field(gt=0)


def get_order(args):
    if args.order_id not in ORDERS:
        raise LookupError(f"No order {args.order_id}")
    return ORDERS[args.order_id]


def refund_order(args):
    REFUNDS.append((args.order_id, args.amount))
    return {"refunded": args.amount}


TOOLS = [
    Tool("get_order", "Look up an order's status and total.", GetOrder, get_order),
    Tool("refund_order", "Refund part or all of an order.", RefundOrder, refund_order),
]
SYSTEM = "You are the support assistant for Kiln & Co."
QUESTION = "Where are my orders 1042 and 1043?"
ANSWER = "Order 1042 has shipped and 1043 is being packed."


def result(call_index, llm, position=-1):
    return json.loads(llm.calls[call_index]["messages"][position]["content"])


@test("Answers the example with two parallel calls")
def _():
    llm = ScriptedLLM([[tool_call("get_order", order_id="1042"), tool_call("get_order", order_id="1043")], ANSWER])
    run = run_agent(llm, QUESTION, TOOLS, system=SYSTEM)
    assert (run.answer, run.steps, run.executed) == (ANSWER, 2, ["get_order", "get_order"])
    assert [m["role"] for m in llm.calls[1]["messages"]] == ["user", "assistant", "tool", "tool"]


@test("Sends the question, the system prompt and every tool's definition")
def _():
    llm = ScriptedLLM(["How can I help?"])
    run_agent(llm, QUESTION, TOOLS, system=SYSTEM)
    call = llm.calls[0]
    assert call["messages"] == [{"role": "user", "content": QUESTION}]
    assert call["system"] == SYSTEM
    assert [tool["name"] for tool in call["tools"]] == ["get_order", "refund_order"]
    assert call["tools"][0]["parameters"]["properties"]["order_id"]["description"] == "Four-digit order number, e.g. 1042"


@test("Results follow the calls' order, each with its own id")
def _():
    first, second = tool_call("get_order", order_id="1043"), tool_call("get_order", order_id="1042")
    llm = ScriptedLLM([[first, second], ANSWER])
    run_agent(llm, QUESTION, TOOLS, system=SYSTEM)
    history = llm.calls[1]["messages"]
    assert [m["tool_call_id"] for m in history[2:]] == [first.id, second.id]
    assert [json.loads(m["content"])["order_id"] for m in history[2:]] == ["1043", "1042"]
    assert json.loads(history[2]["content"])["total"] == "12.00"


@test("Invalid arguments are refused before the tool runs")
def _():
    REFUNDS.clear()
    llm = ScriptedLLM([tool_call("refund_order", order_id="1042", amount=-20), "That amount doesn't look right."])
    run = run_agent(llm, "Refund me", TOOLS, system=SYSTEM)
    assert REFUNDS == []
    assert run.executed == []
    error = result(1, llm)["error"]
    assert error.startswith("Invalid arguments for refund_order: ")
    assert "amount: Input should be greater than 0" in error


@test("Unknown tools and failing tools become error results")
def _():
    llm = ScriptedLLM([[tool_call("cancel_order", order_id="1042"), tool_call("get_order", order_id="9999")],
                       "I can't cancel orders, and I can't find 9999."])
    run = run_agent(llm, QUESTION, TOOLS, system=SYSTEM)
    assert result(1, llm, -2) == {"error": "Unknown tool: cancel_order"}
    assert result(1, llm, -1) == {"error": "No order 9999"}
    assert run.executed == []


@hidden("One bad call in a turn doesn't stop the good ones")
def _():
    REFUNDS.clear()
    llm = ScriptedLLM([
        Reply(text="Checking.", tool_calls=[tool_call("get_order", order_id="10423"), tool_call("get_order", order_id="1042")]),
        tool_call("refund_order", order_id="1042", amount="10.00"),
        "Refunded 10.00 on order 1042.",
    ])
    run = run_agent(llm, "Refund 10 on 1042", TOOLS, system=SYSTEM)
    assert run.steps == 3
    assert run.executed == ["get_order", "refund_order"]
    assert REFUNDS == [("1042", Decimal("10.00"))]
    assert "order_id" in result(1, llm, -2)["error"]
    assert [m["role"] for m in llm.calls[2]["messages"]] == ["user", "assistant", "tool", "tool", "assistant", "tool"]


@hidden("Stops at max_steps")
def _():
    llm = ScriptedLLM([tool_call("get_order", order_id="1042")] * 2)
    raises(StepLimitExceeded, run_agent, llm, QUESTION, TOOLS, system=SYSTEM, max_steps=2)
    assert len(llm.calls) == 2
