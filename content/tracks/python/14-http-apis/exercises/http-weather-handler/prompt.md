The mobile team is building a weather screen before the real forecast API is ready. Write the fake
server they'll develop against: a handler function `forecast_server(request)` that takes an
`httpx.Request` and returns an `httpx.Response`, for use with `httpx.MockTransport`. The forecast
data is in the starter's `FORECASTS`, keyed by lowercase city name.

It serves one endpoint, `GET /v1/forecast?city=<name>&days=<n>`, and checks the request in this
order:

| Request | Status | JSON body |
|---------|--------|-----------|
| any path other than `/v1/forecast` | 404 | `{"error": "not found"}` |
| a method other than `GET` | 405, with an `Allow: GET` header | `{"error": "method not allowed"}` |
| no `city`, or an empty one | 400 | `{"error": "city is required"}` |
| `days` that isn't a whole number from 1 to 7 | 400 | `{"error": "days must be a whole number from 1 to 7"}` |
| a city that isn't in `FORECASTS` | 404 | `{"error": "unknown city: Atlantis"}` (the name as sent) |
| otherwise | 200 | `{"city": "Lisbon", "days": [...]}`: the city's name and its first `days` days |

`days` is optional and defaults to 3. Cities match whatever their case.

```python
client = httpx.Client(transport=httpx.MockTransport(forecast_server), base_url="https://api.weather.example")
client.get("/v1/forecast", params={"city": "lisbon", "days": 2}).json()
# {"city": "Lisbon", "days": [{"date": "2026-10-01", "high": 24, "low": 16, "summary": "sunny"},
#                             {"date": "2026-10-02", "high": 23, "low": 16, "summary": "sunny"}]}
```
