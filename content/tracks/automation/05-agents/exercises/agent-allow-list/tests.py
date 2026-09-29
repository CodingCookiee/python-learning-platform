from plp import hidden, raises, test
from solution import scope_tools


def tool(name):
    return {"name": name, "description": f"{name.replace('_', ' ')}.", "parameters": {"type": "object", "properties": {}}}


NAMES = ["get_invoice", "list_overdue", "send_reminder", "issue_refund", "delete_customer"]
TOOLS = [tool(name) for name in NAMES]
REGISTRY = {name: (lambda name=name: name) for name in NAMES}


@test("Keeps only the allowed tools, as in the example")
def _():
    definitions, registry = scope_tools(TOOLS, REGISTRY, {"list_overdue", "get_invoice"})
    assert [t["name"] for t in definitions] == ["get_invoice", "list_overdue"]
    assert sorted(registry) == ["get_invoice", "list_overdue"]
    assert registry["get_invoice"] is REGISTRY["get_invoice"]


@test("Keeps the tools' own order, whatever order allow is in")
def _():
    definitions, _ = scope_tools(TOOLS, REGISTRY, {"send_reminder", "get_invoice", "list_overdue"})
    assert [t["name"] for t in definitions] == ["get_invoice", "list_overdue", "send_reminder"]


@test("Allowing a tool that doesn't exist is an error")
def _():
    raises(ValueError, scope_tools, TOOLS, REGISTRY, {"get_invoice", "issue_refunds"}, match="issue_refunds")


@hidden("An empty allow-list gives no tools, and the inputs don't change")
def _():
    assert scope_tools(TOOLS, REGISTRY, set()) == ([], {})
    scope_tools(TOOLS, REGISTRY, {"get_invoice"})
    assert len(TOOLS) == 5 and len(REGISTRY) == 5
