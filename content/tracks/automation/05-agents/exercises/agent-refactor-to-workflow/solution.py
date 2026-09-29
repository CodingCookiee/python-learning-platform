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


def weekly_summary(llm, account_id: str) -> str:
    """Gather the account's data in code, then make one model call to write the summary."""
    account = get_account(account_id)
    tickets = get_open_tickets(account_id)
    invoices = get_unpaid_invoices(account_id)
    content = "\n\n".join([
        f"Write this week's summary for account {account_id}.",
        f"Account:\n{json.dumps(account)}",
        f"Open tickets:\n{json.dumps(tickets)}",
        f"Unpaid invoices:\n{json.dumps(invoices)}",
    ])
    return llm.complete([{"role": "user", "content": content}], system=SYSTEM).text
