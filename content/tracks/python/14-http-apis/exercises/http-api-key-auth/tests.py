import httpx

from plp import hidden, test
from solution import ApiKeyAuth

KEY = "wk_live_9f2c41d8"


class Recorder:
    def __init__(self):
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        return httpx.Response(200, json={})


def client_with(auth):
    recorder = Recorder()
    return recorder, httpx.Client(auth=auth, transport=httpx.MockTransport(recorder), timeout=10)


@test("Sends the key to its own host only, and hides it in the repr")
def _():
    auth = ApiKeyAuth(KEY, host="api.weather.example")
    recorder, client = client_with(auth)
    client.get("https://api.weather.example/v1/forecast?city=Oslo")
    client.get("https://files.weather.example/maps/oslo.png")
    api, files = recorder.requests
    assert api.headers.get("x-api-key") == KEY
    assert "x-api-key" not in files.headers, "The key went to files.weather.example"
    assert repr(auth) == "ApiKeyAuth(header='X-API-Key', host='api.weather.example', key='...41d8')"


@test("Uses the header name it's given")
def _():
    recorder, client = client_with(ApiKeyAuth("sk_crm_5a7b9c1d", host="api.crm.example", header="X-CRM-Token"))
    client.post("https://api.crm.example/v1/contacts", json={"name": "Ada"})
    assert recorder.requests[0].headers.get("x-crm-token") == "sk_crm_5a7b9c1d"
    assert "x-api-key" not in recorder.requests[0].headers


@test("Short keys are hidden completely")
def _():
    auth = ApiKeyAuth("k_8f2a", host="api.weather.example")
    assert "8f2a" not in repr(auth)
    assert repr(auth) == "ApiKeyAuth(header='X-API-Key', host='api.weather.example', key='***')"
    assert "8f2a" not in str(auth)


@test("Works for a single request as well as a whole client")
def _():
    recorder = Recorder()
    client = httpx.Client(transport=httpx.MockTransport(recorder), timeout=10)
    client.get("https://api.weather.example/v1/alerts", auth=ApiKeyAuth(KEY, host="api.weather.example"))
    client.get("https://api.weather.example/v1/alerts")
    assert recorder.requests[0].headers.get("x-api-key") == KEY
    assert "x-api-key" not in recorder.requests[1].headers


@hidden("Works with AsyncClient")
async def _():
    recorder = Recorder()
    async with httpx.AsyncClient(
        auth=ApiKeyAuth(KEY, host="api.weather.example"), transport=httpx.MockTransport(recorder), timeout=10
    ) as client:
        await client.get("https://api.weather.example/v1/forecast")
        await client.get("https://evil.example/collect")
    assert recorder.requests[0].headers.get("x-api-key") == KEY
    assert "x-api-key" not in recorder.requests[1].headers


@hidden("A lookalike host doesn't get the key")
def _():
    recorder, client = client_with(ApiKeyAuth(KEY, host="api.weather.example"))
    client.get("https://api.weather.example.attacker.example/v1/forecast")
    assert "x-api-key" not in recorder.requests[0].headers
