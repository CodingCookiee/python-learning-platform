import json

from plp import hidden, raises, test
from plp_fakes import ScriptedLLM, tool_call
from solution import DECLINED, require_approval

REFUNDS = []


def get_order(order_id):
    return {"order_id": order_id, "status": "delivered", "total": 480}


def issue_refund(order_id, amount):
    REFUNDS.append((order_id, amount))
    return {"refunded": amount, "order_id": order_id}


def cancel_order(order_id):
    return {"cancelled": order_id}


REGISTRY = {"get_order": get_order, "issue_refund": issue_refund, "cancel_order": cancel_order}
SMALL_ONLY = lambda name, args: args["amount"] <= 20


@test("Runs the example's small refund and declines the large one")
def _():
    REFUNDS.clear()
    audit = []
    guarded = require_approval(REGISTRY, {"issue_refund"}, approve=SMALL_ONLY, audit=audit)
    assert guarded["issue_refund"](order_id="1042", amount=12.5) == {"refunded": 12.5, "order_id": "1042"}
    assert guarded["issue_refund"](order_id="1042", amount=480) == {"error": DECLINED.format(name="issue_refund")}
    assert REFUNDS == [("1042", 12.5)]
    assert audit == [
        ("issue_refund", {"order_id": "1042", "amount": 12.5}, "approved"),
        ("issue_refund", {"order_id": "1042", "amount": 480}, "declined"),
    ]


@test("Safe tools are left exactly as they were, and the original registry is untouched")
def _():
    guarded = require_approval(REGISTRY, {"issue_refund", "cancel_order"}, approve=SMALL_ONLY, audit=[])
    assert guarded["get_order"] is get_order
    assert REGISTRY["issue_refund"] is issue_refund
    assert guarded is not REGISTRY


@test("Asks with the tool's name and arguments")
def _():
    asked = []
    guarded = require_approval(REGISTRY, {"cancel_order"}, approve=lambda name, args: asked.append((name, args)) or False, audit=[])
    guarded["cancel_order"](order_id="1043")
    assert asked == [("cancel_order", {"order_id": "1043"})]


@test("An approver that fails means no")
def _():
    REFUNDS.clear()
    audit = []

    def slack_down(name, args):
        raise ConnectionError("Slack is unreachable")

    guarded = require_approval(REGISTRY, {"issue_refund"}, approve=slack_down, audit=audit)
    assert guarded["issue_refund"](order_id="1042", amount=5) == {"error": DECLINED.format(name="issue_refund")}
    assert REFUNDS == []
    assert audit[0][2] == "declined"


@test("Refuses to guard a tool that isn't in the registry")
def _():
    raises(ValueError, require_approval, REGISTRY, {"issue_refunds"}, SMALL_ONLY, [])


@hidden("Only True counts as yes")
def _():
    REFUNDS.clear()
    guarded = require_approval(REGISTRY, {"issue_refund"}, approve=lambda name, args: "yes", audit=[])
    assert "error" in guarded["issue_refund"](order_id="1042", amount=5)
    assert REFUNDS == []


@hidden("In the loop, the model reads the declined message")
def _():
    audit = []
    guarded = require_approval(REGISTRY, {"issue_refund"}, approve=lambda name, args: False, audit=audit)
    llm = ScriptedLLM([tool_call("issue_refund", order_id="1042", amount=480), "A team member will follow up about your refund."])
    messages = [{"role": "user", "content": "Refund my whole order please"}]
    response = llm.complete(messages)
    call = response.tool_calls[0]
    output = guarded[call.name](**call.arguments)
    messages += [{"role": "assistant", "content": "", "tool_calls": [{"id": call.id, "name": call.name, "arguments": call.arguments}]},
                 {"role": "tool", "tool_call_id": call.id, "content": json.dumps(output)}]
    llm.complete(messages)
    assert json.loads(llm.calls[1]["messages"][-1]["content"]) == {"error": DECLINED.format(name="issue_refund")}
    assert audit == [("issue_refund", {"order_id": "1042", "amount": 480}, "declined")]
