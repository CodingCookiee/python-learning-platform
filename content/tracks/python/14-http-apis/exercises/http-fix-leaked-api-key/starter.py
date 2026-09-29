import logging

import httpx

log = logging.getLogger(__name__)


def make_client(api_key, transport=None):
    """A client for the weather API that authenticates every request."""
    return httpx.Client(
        base_url="https://api.weather.example",
        params={"api_key": api_key},
        timeout=10,
        transport=transport,
    )


def get_forecast(client, city):
    """The forecast for a city, as a dict."""
    response = client.get("/v1/forecast", params={"city": city})
    log.info("GET %s -> %s", response.url, response.status_code)
    log.debug("request headers: %s", dict(response.request.headers))
    response.raise_for_status()
    return response.json()
