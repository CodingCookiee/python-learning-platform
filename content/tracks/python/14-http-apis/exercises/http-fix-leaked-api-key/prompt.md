The security team found the production weather API key in three places: the sync job's log
files, the error tracker, and the weather provider's access logs. They've rotated the key; your job
is to make sure the new one never leaks the same way.

The weather API accepts the key in an `X-API-Key` header as well as in the `api_key` query
parameter. Fix `make_client` and `get_forecast` so that:

- the key is sent in the `X-API-Key` header, and never appears in any URL,
- no log record contains the key, at any level, from any logger (httpx logs every request itself),
  whether the request succeeds or fails,
- the error raised for a failed request doesn't contain it either,
- the INFO line still says which URL was fetched and its status, as it does now:
  `GET https://api.weather.example/v1/forecast?city=Lisbon -> 200`.

```python
client = make_client("wk_live_9f2c41d8", transport)
get_forecast(client, "Lisbon")   # {"city": "Lisbon", "high": 24, "low": 16}
```
