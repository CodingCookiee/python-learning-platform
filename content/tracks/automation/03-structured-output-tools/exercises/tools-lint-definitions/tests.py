from plp import hidden, test
from solution import lint_tools

GET_ORDER = {
    "name": "get_order",
    "description": "Look up one order by its order number. Returns status, carrier and tracking_url.",
    "parameters": {"type": "object", "properties": {
        "order_id": {"type": "string", "description": "The four-digit order number, e.g. 1042"}},
        "required": ["order_id"]},
}
FIND_SLOTS = {
    "name": "find_slots",
    "description": "Find free appointment slots for a practitioner on a given day, as ISO start times.",
    "parameters": {"type": "object", "properties": {
        "practitioner": {"type": "string", "description": "Surname, e.g. Patel"},
        "day": {"type": "string", "description": "ISO date, e.g. 2026-10-01"}}},
}


@test("Reports the example's three problems")
def _():
    tools = [{"name": "orders", "description": "Orders API",
              "parameters": {"type": "object", "properties": {"q": {"type": "string"}}}}]
    assert lint_tools(tools) == [
        "orders: name should be verb_noun snake_case",
        "orders: description is too short to tell the model when to use it",
        "orders: parameter q has no description",
    ]


@test("A good tool list is clean")
def _():
    assert lint_tools([GET_ORDER, FIND_SLOTS]) == []


@test("Checks names")
def _():
    renamed = [{**GET_ORDER, "name": name} for name in ("getOrder", "get-order", "Get_order", "get__order", "_get_order", "get_order_v2")]
    assert lint_tools(renamed[:5]) == [f"{t['name']}: name should be verb_noun snake_case" for t in renamed[:5]]
    assert lint_tools([renamed[5]]) == []


@test("Spots JSON crammed into a string, and duplicate names")
def _():
    crm = {"name": "update_crm", "description": "Update a contact, deal or note in the CRM, depending on the action.",
           "parameters": {"type": "object", "properties": {
               "action": {"type": "string", "description": "One of create_contact, add_note, set_stage"},
               "payload": {"type": "string", "description": "The JSON body for that action"}}}}
    assert lint_tools([crm, GET_ORDER, GET_ORDER]) == [
        "update_crm: parameter payload looks like JSON in a string; use typed parameters",
        "get_order: duplicate tool name",
    ]


@hidden("Reports problems in rule order, tool by tool")
def _():
    messy = {"name": "sync", "description": "",
             "parameters": {"type": "object", "properties": {"data": {"type": "string"}, "limit": {"type": "integer", "description": ""}}}}
    assert lint_tools([GET_ORDER, messy]) == [
        "sync: name should be verb_noun snake_case",
        "sync: description is too short to tell the model when to use it",
        "sync: parameter data has no description",
        "sync: parameter limit has no description",
        "sync: parameter data looks like JSON in a string; use typed parameters",
    ]


@hidden("A data parameter that isn't a string is fine, and so is a tool with no parameters")
def _():
    typed = {**GET_ORDER, "name": "set_options", "parameters": {"type": "object", "properties": {
        "options": {"type": "object", "description": "Typed options", "properties": {}}}}}
    bare = {"name": "get_opening_hours", "description": "Today's opening hours for every clinic location.",
            "parameters": {"type": "object", "properties": {}}}
    assert lint_tools([typed, bare]) == []
