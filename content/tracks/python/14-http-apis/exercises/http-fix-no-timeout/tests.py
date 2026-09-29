import httpx

from plp import hidden, raises, test
from solution import fetch_export, make_client

ROWS = {"report": "weekly-pipeline", "rows": [["Kiln Cafe", 3]]}


class ReportsApi:
    """A fake reporting API. Keeps every request; some reports misbehave on purpose."""

    def __init__(self):
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        report = request.url.path.rsplit("/", 1)[-1]
        if report == "stuck-report":
            raise httpx.ReadTimeout("no answer", request=request)
        if report == "no-connection":
            raise httpx.ConnectTimeout("couldn't connect in time", request=request)
        if report == "refused":
            raise httpx.ConnectError("connection refused", request=request)
        if report == "broken":
            return httpx.Response(500, json={"error": "internal error"})
        return httpx.Response(200, json={"report": report, "rows": [["Kiln Cafe", 3]]})


def setup():
    api = ReportsApi()
    return api, make_client(httpx.MockTransport(api))


@test("Downloads an export with a 60-second read timeout")
def _():
    api, client = setup()
    assert fetch_export(client, "weekly-pipeline") == ROWS
    assert api.requests[0].url.path == "/v1/exports/weekly-pipeline"
    assert api.requests[0].extensions["timeout"] == {"connect": 3, "read": 60, "write": 60, "pool": 60}


@test("Every other request gets 3 seconds to connect and 10 for the rest")
def _():
    api, client = setup()
    client.get("/v1/health")
    assert api.requests[0].extensions["timeout"] == {"connect": 3, "read": 10, "write": 10, "pool": 10}


@test("A timed-out export returns None")
def _():
    api, client = setup()
    assert fetch_export(client, "stuck-report") is None
    assert fetch_export(client, "no-connection") is None


@test("Other problems still raise")
def _():
    api, client = setup()
    raises(httpx.ConnectError, fetch_export, client, "refused")
    raises(httpx.HTTPStatusError, fetch_export, client, "broken")


@hidden("The job carries on after a timeout")
def _():
    api, client = setup()
    assert [fetch_export(client, report) for report in ["stuck-report", "weekly-pipeline"]] == [None, ROWS]
    assert len(api.requests) == 2
