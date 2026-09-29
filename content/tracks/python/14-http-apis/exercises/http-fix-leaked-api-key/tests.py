import httpx

from plp import captured_logs, hidden, raises, test
from solution import get_forecast, make_client

KEY = "wk_live_9f2c41d8"


class WeatherApi:
    """A fake weather API that accepts the key in a header or the query string."""

    def __init__(self, valid_key=KEY):
        self.valid_key = valid_key
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        key = request.headers.get("x-api-key") or request.url.params.get("api_key")
        if key != self.valid_key:
            return httpx.Response(401, json={"error": "invalid API key"})
        return httpx.Response(200, json={"city": request.url.params["city"], "high": 24, "low": 16})


def setup(key=KEY):
    api = WeatherApi()
    return api, make_client(key, httpx.MockTransport(api))


def leaks(logs, secret):
    return [message for message in logs.messages if secret in message]


@test("Fetches a forecast, sending the key in X-API-Key")
def _():
    api, client = setup()
    assert get_forecast(client, "Lisbon") == {"city": "Lisbon", "high": 24, "low": 16}
    [request] = api.requests
    assert request.headers.get("x-api-key") == KEY
    assert KEY not in str(request.url), "The key must not be in the URL"


@test("No log record contains the key")
def _():
    api, client = setup()
    with captured_logs() as logs:
        get_forecast(client, "Lisbon")
    assert leaks(logs, KEY) == []


@test("Still logs the URL and status at INFO")
def _():
    api, client = setup()
    with captured_logs("solution") as logs:
        get_forecast(client, "Lisbon")
    info = [record.getMessage() for record in logs if record.levelname == "INFO"]
    assert info == ["GET https://api.weather.example/v1/forecast?city=Lisbon -> 200"]


@test("A rejected key raises without leaking it, in the error or the logs")
def _():
    api, client = setup("wk_live_revoked7")
    with captured_logs() as logs:
        error = raises(httpx.HTTPStatusError, get_forecast, client, "Oslo").value
    assert "wk_live_revoked7" not in str(error)
    assert leaks(logs, "wk_live_revoked7") == []


@hidden("Two clients send their own keys")
def _():
    first, second = WeatherApi(), WeatherApi("wk_live_other000")
    get_forecast(make_client(KEY, httpx.MockTransport(first)), "Porto")
    get_forecast(make_client("wk_live_other000", httpx.MockTransport(second)), "Bergen")
    assert first.requests[0].headers.get("x-api-key") == KEY
    assert second.requests[0].headers.get("x-api-key") == "wk_live_other000"
    assert "api_key" not in second.requests[0].url.params
