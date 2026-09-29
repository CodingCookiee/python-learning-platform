import httpx

from plp import hidden, test
from solution import FORECASTS, forecast_server

LISBON = FORECASTS["lisbon"]["days"]


def client():
    return httpx.Client(transport=httpx.MockTransport(forecast_server), base_url="https://api.weather.example")


def error(response):
    return response.status_code, response.json()


@test("Serves the first two days for Lisbon")
def _():
    response = client().get("/v1/forecast", params={"city": "lisbon", "days": 2})
    assert response.status_code == 200
    assert response.json() == {"city": "Lisbon", "days": LISBON[:2]}


@test("Days defaults to 3, and cities match whatever their case")
def _():
    assert client().get("/v1/forecast", params={"city": "OSLO"}).json() == {
        "city": "Oslo",
        "days": FORECASTS["oslo"]["days"][:3],
    }


@test("A missing city is a 400, an unknown one a 404")
def _():
    assert error(client().get("/v1/forecast")) == (400, {"error": "city is required"})
    assert error(client().get("/v1/forecast", params={"city": ""})) == (400, {"error": "city is required"})
    assert error(client().get("/v1/forecast", params={"city": "Atlantis"})) == (404, {"error": "unknown city: Atlantis"})


@test("Refuses days outside 1 to 7")
def _():
    message = {"error": "days must be a whole number from 1 to 7"}
    for days in ["0", "8", "two", "2.5", "-1"]:
        response = client().get("/v1/forecast", params={"city": "Lisbon", "days": days})
        assert error(response) == (400, message), f"days={days!r} should get a 400 with {message}, got {error(response)}"


@test("Other methods get a 405 with an Allow header")
def _():
    response = client().post("/v1/forecast", json={"city": "Lisbon"})
    assert error(response) == (405, {"error": "method not allowed"})
    assert response.headers.get("allow") == "GET"


@hidden("Other paths are a 404, checked before the method")
def _():
    assert error(client().get("/v1/forecasts", params={"city": "Lisbon"})) == (404, {"error": "not found"})
    assert error(client().delete("/v2/forecast")) == (404, {"error": "not found"})


@hidden("Seven days is the whole week, and checks run in the table's order")
def _():
    assert client().get("/v1/forecast", params={"city": "Lisbon", "days": 7}).json()["days"] == LISBON
    assert error(client().get("/v1/forecast", params={"city": "Atlantis", "days": 9}))[0] == 400
    assert client().put("/v1/forecast").status_code == 405
