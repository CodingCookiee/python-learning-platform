import json

import httpx
from plp import hidden, raises, test
from plp_fakes import ScriptedLLM, Timeout, fake_api
from solution import process_invoice

DOCUMENT = {"id": "doc_88213", "text": "Kiln Supplies, invoice INV-2291, total 1,240.50 EUR, payment terms 30 days"}
FIELDS = {"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "currency": "EUR", "total": "1240.50"}
SUMMARY = "Kiln Supplies, INV-2291, 1,240.50 EUR due in 30 days."


class Accounting:
    """A fake accounting API that honours Idempotency-Key, like the real one."""

    def __init__(self):
        self.bills = []
        self.by_key = {}
        self.api = fake_api({"POST /v1/bills": self.create})
        self.http = httpx.Client(transport=self.api.transport, base_url="https://accounting.example")

    def create(self, request):
        key = request["headers"].get("idempotency-key")
        if key is not None and key in self.by_key:
            return 200, self.by_key[key]
        bill = {"bill_id": f"B-{len(self.bills) + 1:04d}", **request.json}
        self.bills.append(bill)
        if key is not None:
            self.by_key[key] = bill
        return 201, bill


def model(summary_timeouts=1):
    """Extraction always works; the summary times out `summary_timeouts` times first."""
    left = {"timeouts": summary_timeouts}

    def reply(request):
        if "<invoice>" in request["messages"][0]["content"]:
            return json.dumps(FIELDS)
        if left["timeouts"]:
            left["timeouts"] -= 1
            return Timeout()
        return SUMMARY

    return ScriptedLLM([reply] * 12)


@test("Books the example's invoice once, although the summary timed out")
def _():
    accounting = Accounting()
    bill = process_invoice(model(summary_timeouts=1), accounting.http, DOCUMENT)
    assert (bill["bill_id"], bill["summary"]) == ("B-0001", SUMMARY)
    assert len(accounting.bills) == 1


@test("Every post carries the same key, built from the document id")
def _():
    accounting = Accounting()
    process_invoice(model(summary_timeouts=2), accounting.http, DOCUMENT)
    keys = [request["headers"].get("idempotency-key") for request in accounting.api.calls("POST /v1/bills")]
    assert keys, "no bill was posted"
    assert set(keys) == {"bill:doc_88213"}
    assert len(accounting.bills) == 1


@test("Running the same document again the next day doesn't book it again")
def _():
    accounting = Accounting()
    first = process_invoice(model(summary_timeouts=0), accounting.http, DOCUMENT)
    second = process_invoice(model(summary_timeouts=0), accounting.http, DOCUMENT)
    assert first["bill_id"] == second["bill_id"] == "B-0001"
    assert len(accounting.bills) == 1


@hidden("Different documents are different bills")
def _():
    accounting = Accounting()
    process_invoice(model(summary_timeouts=1), accounting.http, DOCUMENT)
    process_invoice(model(summary_timeouts=1), accounting.http, {**DOCUMENT, "id": "doc_88214"})
    assert [bill["document_id"] for bill in accounting.bills] == ["doc_88213", "doc_88214"]


@hidden("Still gives up after MAX_ATTEMPTS timeouts, with one bill booked")
def _():
    accounting = Accounting()
    raises(TimeoutError, process_invoice, model(summary_timeouts=5), accounting.http, DOCUMENT)
    assert len(accounting.bills) == 1
    assert len(accounting.api.calls("POST /v1/bills")) >= 1
