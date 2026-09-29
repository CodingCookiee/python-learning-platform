import json

from plp import captured_logs, hidden, test
from plp_fakes import Reply, ScriptedLLM, tool_call
from solution import run_tools


class OrderNotFound(Exception):
    pass


ORDERS = {"1042": {"order_id": "1042", "status": "shipped", "carrier": "DPD"}}


def lookup_order(order_id):
    if order_id not in ORDERS:
        raise OrderNotFound(f"No order {order_id}")
    return ORDERS[order_id]


TOOLS = [{"name": "lookup_order", "description": "Look up an order by its number.",
          "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]}}]
REGISTRY = {"lookup_order": lookup_order}
QUESTION = [{"role": "user", "content": "Where's order 9999?"}]
SORRY = "I can't find order 9999. Could you check the number on your confirmation email?"


@test("A missing order goes back to the model as an error result")
def _():
    llm = ScriptedLLM([tool_call("lookup_order", order_id="9999"), SORRY])
    assert run_tools(llm, QUESTION, TOOLS, REGISTRY) == SORRY
    assert llm.calls[1]["messages"][-1]["content"] == '{"error": "No order 9999"}'


@test("An unknown tool is an error result too, and nothing runs")
def _():
    llm = ScriptedLLM([tool_call("refund_order", order_id="1042"), "I can't issue refunds, sorry."])
    assert run_tools(llm, QUESTION, TOOLS, REGISTRY) == "I can't issue refunds, sorry."
    assert json.loads(llm.calls[1]["messages"][-1]["content"]) == {"error": "Unknown tool: refund_order"}


@test("Arguments the function can't take become an error result")
def _():
    llm = ScriptedLLM([tool_call("lookup_order", id="1042"), "Let me try that again."])
    run_tools(llm, QUESTION, TOOLS, REGISTRY)
    assert "error" in json.loads(llm.calls[1]["messages"][-1]["content"])


@test("Successful calls work as before, even next to a failing one")
def _():
    good, bad = tool_call("lookup_order", order_id="1042"), tool_call("lookup_order", order_id="9999")
    llm = ScriptedLLM([Reply(tool_calls=[good, bad]), "1042 has shipped; I can't find 9999."])
    run_tools(llm, QUESTION, TOOLS, REGISTRY)
    results = llm.calls[1]["messages"][-2:]
    assert [m["tool_call_id"] for m in results] == [good.id, bad.id]
    assert json.loads(results[0]["content"]) == ORDERS["1042"]
    assert json.loads(results[1]["content"]) == {"error": "No order 9999"}


@hidden("Logs each failure with the tool's name")
def _():
    llm = ScriptedLLM([tool_call("lookup_order", order_id="9999"), tool_call("refund_order", order_id="1"), SORRY])
    with captured_logs("order_assistant") as logs:
        run_tools(llm, QUESTION, TOOLS, REGISTRY)
    assert logs.levels == ["WARNING", "WARNING"]
    assert "lookup_order" in logs.messages[0] and "refund_order" in logs.messages[1]


@hidden("The model can recover and try again")
def _():
    llm = ScriptedLLM([tool_call("lookup_order", order_id="1024"), tool_call("lookup_order", order_id="1042"),
                       "Order 1042 shipped with DPD."])
    assert run_tools(llm, QUESTION, TOOLS, REGISTRY) == "Order 1042 shipped with DPD."
    assert [m["role"] for m in llm.calls[2]["messages"]] == ["user", "assistant", "tool", "assistant", "tool"]
