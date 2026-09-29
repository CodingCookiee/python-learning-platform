import base64

import httpx

from plp import hidden, raises, test
from solution import ClientCredentialsAuth

TOKEN_URL = "https://auth.crm.example/oauth/token"


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class Crm:
    """A fake auth server and API. Issues at_1, at_2, ...; the API accepts only live tokens."""

    def __init__(self, expires_in=3600, token_status=200):
        self.expires_in = expires_in
        self.token_status = token_status
        self.issued = 0
        self.live = set()
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        if request.url.host == "auth.crm.example":
            if self.token_status != 200:
                return httpx.Response(self.token_status, json={"error": "invalid_client"})
            self.issued += 1
            token = f"at_{self.issued}"
            self.live.add(token)
            return httpx.Response(200, json={"access_token": token, "token_type": "Bearer", "expires_in": self.expires_in})
        scheme, _, token = request.headers.get("authorization", "").partition(" ")
        if scheme != "Bearer" or token not in self.live:
            return httpx.Response(401, json={"error": "invalid token"})
        return httpx.Response(200, json={"path": request.url.path, "token": token})

    def summary(self):
        return [(r.method, r.url.path, r.headers.get("authorization", "")) for r in self.requests]


def setup(crm, clock=None, scope="deals:read"):
    auth = ClientCredentialsAuth(TOKEN_URL, "sync-job", "cs_live_77ab", scope=scope, clock=clock or FakeClock())
    client = httpx.Client(base_url="https://api.crm.example", auth=auth, transport=httpx.MockTransport(crm), timeout=10)
    return client


BASIC = "Basic " + base64.b64encode(b"sync-job:cs_live_77ab").decode()


@test("Fetches a token once, then reuses it")
def _():
    crm = Crm()
    client = setup(crm)
    assert client.get("/v1/deals").json() == {"path": "/v1/deals", "token": "at_1"}
    assert client.get("/v1/contacts").json() == {"path": "/v1/contacts", "token": "at_1"}
    assert crm.summary() == [
        ("POST", "/oauth/token", BASIC),
        ("GET", "/v1/deals", "Bearer at_1"),
        ("GET", "/v1/contacts", "Bearer at_1"),
    ]


@test("The token request is a client credentials form")
def _():
    crm = Crm()
    setup(crm).get("/v1/deals")
    token_request = crm.requests[0]
    assert token_request.headers.get("content-type") == "application/x-www-form-urlencoded"
    assert dict(httpx.QueryParams(token_request.content.decode())) == {"grant_type": "client_credentials", "scope": "deals:read"}


@test("Fetches a new token 30 seconds before the old one expires")
def _():
    crm, clock = Crm(expires_in=600), FakeClock()
    client = setup(crm, clock)
    client.get("/v1/deals")
    clock.now += 569
    assert client.get("/v1/deals").json()["token"] == "at_1"
    clock.now += 1
    assert client.get("/v1/deals").json()["token"] == "at_2"
    assert crm.issued == 2


@test("A revoked token is replaced and the request sent again")
def _():
    crm = Crm()
    client = setup(crm)
    client.get("/v1/deals")
    crm.live.clear()
    assert client.get("/v1/deals").json() == {"path": "/v1/deals", "token": "at_2"}
    assert [path for method, path, auth in crm.summary()] == ["/oauth/token", "/v1/deals", "/v1/deals", "/oauth/token", "/v1/deals"]


@hidden("A second 401 is returned, not retried forever")
def _():
    crm = Crm()
    client = setup(crm)
    crm.live = type("Nothing", (), {"__contains__": lambda self, item: False, "add": lambda self, item: None})()
    assert client.get("/v1/deals").status_code == 401
    assert len(crm.requests) == 4


@hidden("A failing token endpoint raises, and no scope means no scope field")
def _():
    raises(httpx.HTTPStatusError, setup(Crm(token_status=401)).get, "/v1/deals")
    crm = Crm()
    setup(crm, scope=None).get("/v1/deals")
    assert dict(httpx.QueryParams(crm.requests[0].content.decode())) == {"grant_type": "client_credentials"}
