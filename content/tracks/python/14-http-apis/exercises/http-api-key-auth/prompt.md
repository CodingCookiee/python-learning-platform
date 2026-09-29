Write `ApiKeyAuth`, an `httpx.Auth` subclass that adds an API key header to requests, and is careful
with it:

```python
ApiKeyAuth(key, *, host, header="X-API-Key")
```

- Every request to `host` gets the header `header: key`.
- A request to any **other** host gets no key at all. APIs hand out full URLs (a download link on a
  file store, a webhook target), and a client-wide key would otherwise follow them there.
- `repr(auth)` never shows the key. It shows its last four characters, or `***` if the key is 8
  characters or shorter:

```python
auth = ApiKeyAuth("wk_live_9f2c41d8", host="api.weather.example")
client = httpx.Client(auth=auth, transport=transport, timeout=10)
client.get("https://api.weather.example/v1/forecast?city=Oslo")   # sent with X-API-Key: wk_live_9f2c41d8
client.get("https://files.weather.example/maps/oslo.png")         # sent with no X-API-Key
repr(auth)   # "ApiKeyAuth(header='X-API-Key', host='api.weather.example', key='...41d8')"
```

Because `auth_flow` is a generator, the same class works with `httpx.AsyncClient` without changes.
