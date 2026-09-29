import httpx
from plp import captured_logs, hidden, raises, test
from plp_fakes import fake_api
from solution import make_client, push_lead

AMIRA = {"email": "amira@example.com", "name": "Amira Haddad"}


def hanging_crm(req):
    raise httpx.ReadTimeout("The CRM accepted the connection and never answered")


def crm(handler):
    server = fake_api({"POST /v1/contacts": handler})
    return server, make_client("test-token", transport=server.transport)


@test("A CRM that never answers: push_lead returns None and logs a warning")
def _():
    _, client = crm(hanging_crm)
    with captured_logs() as logs:
        assert push_lead(client, AMIRA) is None
    assert logs.levels == ["WARNING"]
    assert "amira@example.com" in logs.text


@test("The client has a read timeout of at most 10 seconds")
def _():
    timeout = make_client("test-token").timeout
    assert timeout.read is not None, "timeout=None means a hung CRM blocks the worker for ever"
    assert timeout.read <= 10


@test("The client gives up connecting after at most 5 seconds")
def _():
    timeout = make_client("test-token").timeout
    assert timeout.connect is not None, "set a connect timeout too"
    assert timeout.connect <= 5


@test("A successful call returns the contact id")
def _():
    server, client = crm(lambda req: (201, {"id": "c_881", **req.json}))
    assert push_lead(client, AMIRA) == "c_881"
    assert server.requests[0].json == AMIRA


@hidden("Other HTTP errors still raise")
def _():
    _, client = crm(lambda req: (500, {"error": "internal"}))
    raises(httpx.HTTPStatusError, push_lead, client, AMIRA)


@hidden("Every kind of timeout is handled, not just read timeouts")
def _():
    def slow_connect(req):
        raise httpx.ConnectTimeout("Couldn't reach the CRM")

    _, client = crm(slow_connect)
    with captured_logs():
        assert push_lead(client, AMIRA) is None


@hidden("Connection errors that aren't timeouts are not swallowed")
def _():
    def refused(req):
        raise httpx.ConnectError("Connection refused")

    _, client = crm(refused)
    raises(httpx.ConnectError, push_lead, client, AMIRA)
