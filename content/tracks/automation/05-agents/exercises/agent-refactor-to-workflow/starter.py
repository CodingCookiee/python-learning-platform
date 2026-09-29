import json

SYSTEM = (
    "You write the Monday account summary for Northwind's customer success team: one short paragraph "
    "with open tickets, unpaid invoices and one suggested action."
)

ACCOUNTS = {"A-17": {"id": "A-17", "name": "Harbour Dental", "plan": "growth", "owner": "Priya"}}
TICKETS = [
    {"id": "T-881", "account_id": "A-17", "subject": "Export fails", "urgent": True},
    {"id": "T-884", "account_id": "A-17", "subject": "Add a second admin", "urgent": False},
    {"id": "T-902", "account_id": "A-22", "subject": "Password reset", "urgent": False},
]
INVOICES = [
    {"number": "INV-2291", "account_id": "A-17", "amount": "1,450.00", "paid": False},
    {"number": "INV-2240", "account_id": "A-17", "amount": "1,450.00", "paid": True},
]


def get_account(account_id):
    return ACCOUNTS[account_id]


def get_open_tickets(account_id):
    return [t for t in TICKETS if t["account_id"] == account_id]


def get_unpaid_invoices(account_id):
    return [i for i in INVOICES if i["account_id"] == account_id and not i["paid"]]


def _tool(name, description):
    return {"name": name, "description": description,
            "parameters": {"type": "object", "properties": {"account_id": {"type": "string"}}, "required": ["account_id"]}}


TOOLS = [
    _tool("get_account", "Look up an account by id."),
    _tool("get_open_tickets", "List an account's open support tickets."),
    _tool("get_unpaid_invoices", "List an account's unpaid invoices."),
]
REGISTRY = {"get_account": get_account, "get_open_tickets": get_open_tickets, "get_unpaid_invoices": get_unpaid_invoices}


def weekly_summary(llm, account_id, *, max_steps=6):
    task = f"Write this week's summary for account {account_id}."
    messages = [{"role": "user", "content": task + " Look up the account, its open tickets and its unpaid invoices first."}]
    for _ in range(max_steps):
        response = llm.complete(messages, system=SYSTEM, tools=TOOLS)
        if not response.tool_calls:
            return response.text
        messages.append({"role": "assistant", "content": response.text,
                         "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]})
        for call in response.tool_calls:
            output = REGISTRY[call.name](**call.arguments)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps(output)})
    raise RuntimeError("No summary after the step cap")
