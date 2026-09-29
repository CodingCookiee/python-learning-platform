import json

from plp import hidden, test
from plp_fakes import ScriptedLLM, tool_call
from solution import DECLINED, ApprovalGate, run_agent

TASK = "Chase Harbour Dental about INV-2291."
TOOLS = [{"name": "send_reminder", "description": "Email a payment reminder.", "parameters": {"type": "object", "properties": {}}},
         {"name": "get_invoice", "description": "Look up an invoice.", "parameters": {"type": "object", "properties": {}}}]
BODY = "Hi, invoice INV-2291 for 1,450.00 is 18 days overdue."


class Outbox:
    def __init__(self, failures=0):
        self.sent, self.failures = [], failures

    def send_reminder(self, invoice_id, to, body):
        if self.failures:
            self.failures -= 1
            raise TimeoutError("email service timed out")
        self.sent.append(to)
        return {"sent": invoice_id, "to": to}


class Approver:
    def __init__(self, answer):
        self.answer, self.asked = answer, []

    def __call__(self, name, arguments):
        self.asked.append((name, arguments.get("to")))
        return self.answer(arguments) if callable(self.answer) else self.answer


def gate_for(outbox, approver):
    registry = {"send_reminder": outbox.send_reminder, "get_invoice": lambda invoice_id: {"number": invoice_id}}
    return ApprovalGate(registry, risky={"send_reminder"}, approver=approver)


def reminder(to, body=BODY):
    return tool_call("send_reminder", invoice_id="INV-2291", to=to, body=body)


@test("A retry to a different address asks again, as in the example")
def _():
    outbox = Outbox(failures=1)
    approver = Approver(lambda arguments: arguments["to"] == "accounts@harbour.example")
    llm = ScriptedLLM([reminder("accounts@harbour.example"), reminder("priya@gmail.example", "Please pay INV-2291 today."),
                       "The reminder couldn't be sent. Please check the billing contact for Harbour Dental."])
    run_agent(llm, TASK, TOOLS, gate_for(outbox, approver))
    assert approver.asked == [("send_reminder", "accounts@harbour.example"), ("send_reminder", "priya@gmail.example")]
    assert outbox.sent == []
    assert json.loads(llm.calls[2]["messages"][-1]["content"]) == {"error": DECLINED.format(name="send_reminder")}


@test("Retrying the exact same call doesn't ask twice")
def _():
    outbox, approver = Outbox(failures=1), Approver(True)
    gate = gate_for(outbox, approver)
    arguments = {"invoice_id": "INV-2291", "to": "accounts@harbour.example", "body": BODY}
    try:
        gate.run("send_reminder", arguments)
    except TimeoutError:
        pass
    assert gate.run("send_reminder", dict(reversed(list(arguments.items())))) == {"sent": "INV-2291", "to": "accounts@harbour.example"}
    assert len(approver.asked) == 1 and outbox.sent == ["accounts@harbour.example"]


@test("A declined call stays declined, without asking again")
def _():
    outbox, approver = Outbox(), Approver(False)
    gate = gate_for(outbox, approver)
    arguments = {"invoice_id": "INV-2291", "to": "accounts@harbour.example", "body": BODY}
    assert gate.run("send_reminder", arguments) == {"error": DECLINED.format(name="send_reminder")}
    assert gate.run("send_reminder", arguments) == {"error": DECLINED.format(name="send_reminder")}
    assert len(approver.asked) == 1 and outbox.sent == []


@test("Any change to the arguments is a new call")
def _():
    outbox, approver = Outbox(), Approver(True)
    gate = gate_for(outbox, approver)
    gate.run("send_reminder", {"invoice_id": "INV-2291", "to": "accounts@harbour.example", "body": BODY})
    gate.run("send_reminder", {"invoice_id": "INV-2291", "to": "accounts@harbour.example", "body": BODY + " Final notice."})
    assert len(approver.asked) == 2


@hidden("Tools that aren't risky never ask")
def _():
    approver = Approver(False)
    gate = gate_for(Outbox(), approver)
    assert gate.run("get_invoice", {"invoice_id": "INV-2291"}) == {"number": "INV-2291"}
    assert approver.asked == []
