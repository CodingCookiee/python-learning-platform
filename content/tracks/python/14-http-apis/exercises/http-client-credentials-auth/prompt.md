The CRM's API uses the OAuth 2 client credentials flow. Write an `httpx.Auth` subclass that does the
whole flow, so the sync job's code just makes requests:

```python
ClientCredentialsAuth(token_url, client_id, client_secret, *, scope=None, clock=time.monotonic)
```

**Getting a token.** Send `POST token_url` with a form body of `grant_type=client_credentials`
(plus `scope=<scope>` if one was given), and the client ID and secret as HTTP basic auth. The token
endpoint answers with JSON such as `{"access_token": "at_1", "token_type": "Bearer", "expires_in": 3600}`.
If it answers with an error status, raise `httpx.HTTPStatusError` (`raise_for_status()` does it).

**Using it.** Every request gets `Authorization: Bearer <access_token>`.

**Reusing it.** Fetch a token before the first request, then reuse it until 30 seconds before it
expires, measured with `clock()` (tests pass a fake clock). After that, fetch a new one before the
next request.

**Refreshing on 401.** If the API answers `401`, the token may have been revoked early: fetch a new
token and send the request once more. If that also gets a `401`, return it; don't loop.

```python
auth = ClientCredentialsAuth("https://auth.crm.example/oauth/token", "sync-job", "cs_live_77ab", scope="deals:read")
client = httpx.Client(base_url="https://api.crm.example", auth=auth, transport=transport, timeout=10)
client.get("/v1/deals")      # POST /oauth/token, then GET /v1/deals with Bearer at_1
client.get("/v1/contacts")   # GET /v1/contacts with Bearer at_1: no new token needed
```
