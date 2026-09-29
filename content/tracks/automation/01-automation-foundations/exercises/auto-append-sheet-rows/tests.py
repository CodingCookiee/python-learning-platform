from datetime import UTC, datetime

import httpx
from plp import hidden, raises, test
from plp_fakes import fake_api
from solution import append_leads

SHEET_ID = "1BxiMVs0XRA5nFMd"
COLUMNS = ["received_at", "name", "email", "company", "source"]
AMIRA = {
    "received_at": datetime(2026, 3, 9, 8, 14, tzinfo=UTC),
    "name": "Amira Haddad",
    "email": "amira@example.com",
    "company": "Haddad Physio",
    "source": "website",
}
TOM = {"name": "Tom Price", "email": "tom@example.com", "company": None, "received_at": "2026-03-09T08:31:00"}


def sheets():
    def append(req, sheet_id):
        rows = req.json["values"]
        return {"spreadsheetId": sheet_id, "updates": {"updatedRows": len(rows), "updatedRange": "Leads!A2:E9"}}

    server = fake_api({"POST /v4/spreadsheets/{sheet_id}/values/Leads:append": append})
    return server, httpx.Client(transport=server.transport, base_url="https://sheets.googleapis.com/v4")


@test("Appends one lead as a row in column order")
def _():
    server, client = sheets()
    assert append_leads(client, SHEET_ID, [AMIRA], COLUMNS) == 1
    assert server.requests[0].json == {
        "values": [["2026-03-09T08:14:00+00:00", "Amira Haddad", "amira@example.com", "Haddad Physio", "website"]]
    }


@test("Writes RAW values, so form text never becomes a formula")
def _():
    server, client = sheets()
    append_leads(client, SHEET_ID, [AMIRA], COLUMNS)
    assert server.requests[0]["query"] == {"valueInputOption": "RAW"}


@test("Missing keys and None become empty cells")
def _():
    server, client = sheets()
    assert append_leads(client, SHEET_ID, [AMIRA, TOM], COLUMNS) == 2
    assert server.requests[0].json["values"][1] == ["2026-03-09T08:31:00", "Tom Price", "tom@example.com", "", ""]


@test("All the leads go in one request")
def _():
    server, client = sheets()
    append_leads(client, SHEET_ID, [AMIRA, TOM, AMIRA], COLUMNS)
    assert len(server.requests) == 1
    assert server.requests[0]["path"] == f"/v4/spreadsheets/{SHEET_ID}/values/Leads:append"


@hidden("No leads, no request")
def _():
    server, client = sheets()
    assert append_leads(client, SHEET_ID, [], COLUMNS) == 0
    assert server.requests == []


@hidden("A different sheet name goes in the path")
def _():
    server = fake_api({"POST /v4/spreadsheets/{sheet_id}/values/Archive:append": {"updates": {"updatedRows": 1}}})
    client = httpx.Client(transport=server.transport, base_url="https://sheets.googleapis.com/v4")
    assert append_leads(client, SHEET_ID, [AMIRA], ["email"], sheet="Archive") == 1
    assert server.requests[0].json == {"values": [["amira@example.com"]]}


@hidden("An error status raises HTTPStatusError")
def _():
    server = fake_api({"POST /v4/spreadsheets/{sheet_id}/values/Leads:append": (403, {"error": {"code": 403, "status": "PERMISSION_DENIED"}})})
    client = httpx.Client(transport=server.transport, base_url="https://sheets.googleapis.com/v4")
    raises(httpx.HTTPStatusError, append_leads, client, SHEET_ID, [AMIRA], COLUMNS)
