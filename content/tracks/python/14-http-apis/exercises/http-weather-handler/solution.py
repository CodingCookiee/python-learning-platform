import httpx

FORECASTS = {
    "lisbon": {
        "name": "Lisbon",
        "days": [
            {"date": "2026-10-01", "high": 24, "low": 16, "summary": "sunny"},
            {"date": "2026-10-02", "high": 23, "low": 16, "summary": "sunny"},
            {"date": "2026-10-03", "high": 21, "low": 15, "summary": "cloudy"},
            {"date": "2026-10-04", "high": 19, "low": 14, "summary": "rain"},
            {"date": "2026-10-05", "high": 20, "low": 14, "summary": "showers"},
            {"date": "2026-10-06", "high": 22, "low": 15, "summary": "sunny"},
            {"date": "2026-10-07", "high": 23, "low": 16, "summary": "sunny"},
        ],
    },
    "oslo": {
        "name": "Oslo",
        "days": [
            {"date": "2026-10-01", "high": 9, "low": 3, "summary": "cloudy"},
            {"date": "2026-10-02", "high": 8, "low": 2, "summary": "rain"},
            {"date": "2026-10-03", "high": 7, "low": 1, "summary": "rain"},
            {"date": "2026-10-04", "high": 10, "low": 4, "summary": "cloudy"},
            {"date": "2026-10-05", "high": 11, "low": 5, "summary": "sunny"},
            {"date": "2026-10-06", "high": 9, "low": 3, "summary": "windy"},
            {"date": "2026-10-07", "high": 6, "low": 0, "summary": "sleet"},
        ],
    },
}


def forecast_server(request):
    """A fake forecast API: takes an httpx.Request, returns an httpx.Response."""
    if request.url.path != "/v1/forecast":
        return httpx.Response(404, json={"error": "not found"})
    if request.method != "GET":
        return httpx.Response(405, json={"error": "method not allowed"}, headers={"Allow": "GET"})

    city_name = request.url.params.get("city", "")
    if not city_name:
        return httpx.Response(400, json={"error": "city is required"})

    days_text = request.url.params.get("days", "3")
    if not days_text.isdigit() or not 1 <= int(days_text) <= 7:
        return httpx.Response(400, json={"error": "days must be a whole number from 1 to 7"})

    city = FORECASTS.get(city_name.lower())
    if city is None:
        return httpx.Response(404, json={"error": f"unknown city: {city_name}"})
    return httpx.Response(200, json={"city": city["name"], "days": city["days"][: int(days_text)]})
