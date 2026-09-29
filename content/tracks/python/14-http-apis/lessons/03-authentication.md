---
slug: authentication
title: Authentication and secrets
summary: API keys, bearer tokens, basic auth and OAuth 2, sent the right way and kept out of URLs, logs and reprs.
minutes: 45
exercises:
  - http-basic-auth-header
  - http-predict-header-repr
  - http-fix-leaked-api-key
  - http-api-key-auth
  - http-client-credentials-auth
---

Almost every API wants to know who's calling. There are only a handful of ways to tell it, and they
all come down to putting a secret in a header. Sending the secret is the easy part. The hard part is
all the places it ends up without your meaning it to: a URL in a log file, an exception message in
the error tracker, an object's repr in a debugging session, a commit on GitHub. This lesson covers
the common schemes, OAuth 2 as a concept, and the habits that keep secrets where they belong.

## Secrets come from the environment

A secret never goes in your source code. Read it from an environment variable (or a secrets
manager) when the program starts, so the code can be shared and the key can be changed without
a deploy:

```python norun
import os

api_key = os.environ["WEATHER_API_KEY"]   # a KeyError at start-up if it's missing, which is what you want
```

Module 9's Pydantic settings do this for a whole configuration at once, and `SecretStr` makes sure a
secret doesn't print by accident:

```python
from pydantic import BaseModel, SecretStr


class WeatherSettings(BaseModel):
    base_url: str = "https://api.weather.example"
    api_key: SecretStr


settings = WeatherSettings(api_key="wk_live_9f2c41d8")
print(settings)
settings.api_key.get_secret_value()
```

The secret is still there when you ask for it by name, and hidden everywhere else.

## API keys in headers

The simplest scheme is a long random key the provider gives you, sent with every request. Send it in
a **header**. Many APIs also accept it in the query string, and that's the wrong way, because URLs
get written down everywhere. httpx itself logs every URL it requests:

```python
import logging
import sys

import httpx

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", stream=sys.stdout)


def weather(request):
    return httpx.Response(200, json={"city": "Lisbon", "high": 24})


client = httpx.Client(transport=httpx.MockTransport(weather), base_url="https://api.weather.example", timeout=10)
client.get("/v1/forecast", params={"city": "Lisbon", "api_key": "wk_live_9f2c41d8"})
client.get("/v1/forecast", params={"city": "Lisbon"}, headers={"X-API-Key": "wk_live_9f2c41d8"})
```

The first log line contains the key. So would the server's access log, any proxy's log, and the
message of any `HTTPStatusError`, which includes the URL. In a header, it's in none of those.

> [!WARNING]
> Client-level `params=` and `headers=` are sent with **every** request the client makes, including
> requests to a full URL on a different host, such as a download link the API hands you. Don't let
> a key for one API travel to another: the `Auth` class later in this lesson can check the host.

## Bearer tokens

A **bearer token** is sent as `Authorization: Bearer <token>`. "Bearer" means whoever holds the
token gets in, so treat it exactly like a password. GitHub's personal access tokens and every OAuth
access token work this way:

```python norun
import os

import httpx

github = httpx.Client(
    base_url="https://api.github.com",
    headers={"Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}", "Accept": "application/vnd.github+json"},
    timeout=10,
)
github.get("/user").json()["login"]
```

A server answers a missing or invalid token with `401 Unauthorized`, and a valid token that isn't
allowed to do this with `403 Forbidden`:

```python
import httpx

TOKENS = {"ghp_R4nd0mT0k3n": "ada"}


def fake_github(request):
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme != "Bearer" or token not in TOKENS:
        return httpx.Response(401, json={"message": "Bad credentials"}, headers={"WWW-Authenticate": "Bearer"})
    return httpx.Response(200, json={"login": TOKENS[token]})


transport = httpx.MockTransport(fake_github)
for token in ["ghp_R4nd0mT0k3n", "ghp_expired"]:
    client = httpx.Client(base_url="https://api.github.com", headers={"Authorization": f"Bearer {token}"}, transport=transport, timeout=10)
    response = client.get("/user")
    print(response.status_code, response.json())
```

## Basic auth

**Basic auth** sends a username and password as `Authorization: Basic <base64 of "username:password">`.
Payment and messaging APIs often use it with an account ID and a secret, and OAuth token endpoints
use it for the client ID and secret. httpx builds the header from a tuple:

```python
import base64

import httpx


def echo(request):
    return httpx.Response(200, json={"authorization": request.headers["authorization"]})


client = httpx.Client(transport=httpx.MockTransport(echo), auth=("AC8f2a", "sms-auth-token"), timeout=10)
header = client.get("https://api.sms.example/v1/messages").json()["authorization"]
print(header)
base64.b64decode(header.removeprefix("Basic ")).decode()
```

Base64 is an **encoding**, not encryption: anyone who sees the header has the password. Basic auth
is only safe over HTTPS, which is true of every scheme in this lesson.

## Auth classes: credentials in one place

For anything beyond a fixed header, subclass `httpx.Auth` and give the client an instance. Its
`auth_flow` method is a generator: it receives each request, changes it, and yields it for httpx
to send.

```python
import httpx


class ApiKeyAuth(httpx.Auth):
    def __init__(self, key):
        self.key = key

    def auth_flow(self, request):
        request.headers["X-API-Key"] = self.key
        yield request


def weather(request):
    return httpx.Response(200, json={"got_key": request.headers.get("x-api-key") == "wk_live_9f2c41d8"})


client = httpx.Client(transport=httpx.MockTransport(weather), auth=ApiKeyAuth("wk_live_9f2c41d8"), timeout=10)
client.get("https://api.weather.example/v1/forecast", params={"city": "Oslo"}).json()
```

Because it's a generator, the flow can also see the answer: `response = yield request` receives
the response, just like `send()` in module 8. If the response is a `401`, the flow can fetch a fresh
token and `yield request` again, and the code calling `client.get` never knows it happened. The
last drill builds exactly that.

> [!JS]
> Coming from JavaScript: an `httpx.Auth` class does the job of an axios request interceptor that
> adds a header, plus a response interceptor that refreshes a token on `401`, in one generator.
> httpx's `event_hooks` exist too, but they're for observing requests, not for credentials.

## OAuth 2 in one page

OAuth 2 is how an app gets an **access token** without ever handling a user's password. Two flows
cover almost everything you'll do.

**Client credentials** is machine to machine: your nightly sync job, acting as itself. It posts its
client ID and secret (as basic auth) to the provider's token endpoint and gets back a short-lived
bearer token:

```python
import httpx


def crm(request):
    if request.url.path == "/oauth/token":
        print("token request:", request.headers["authorization"].split()[0], request.content)
        return httpx.Response(200, json={"access_token": "at_5f1c", "token_type": "Bearer", "expires_in": 3600})
    print("API request with:", request.headers.get("authorization"))
    return httpx.Response(200, json={"open_deals": 12})


transport = httpx.MockTransport(crm)
auth_client = httpx.Client(base_url="https://auth.crm.example", transport=transport, timeout=10)
token = auth_client.post(
    "/oauth/token",
    data={"grant_type": "client_credentials", "scope": "deals:read"},
    auth=("sync-job", "cs_live_77ab"),
).raise_for_status().json()

api = httpx.Client(
    base_url="https://api.crm.example",
    headers={"Authorization": f"Bearer {token['access_token']}"},
    transport=transport,
    timeout=10,
)
api.get("/v1/deals/summary").json()
```

The token expires after `expires_in` seconds. Keep it and reuse it until shortly before then,
rather than fetching a new one for every request.

**Authorization code** is for acting on behalf of a person: "Connect your Google account". The
user's browser does part of the work:

```text
1. Your app redirects the browser to the provider:
     https://auth.provider.example/authorize?client_id=...&redirect_uri=...&scope=contacts.read&state=r4nd0m
2. The user logs in at the provider (never on your site) and approves the scopes.
3. The provider redirects back:  https://yourapp.example/callback?code=c0de&state=r4nd0m
4. Your server checks that state matches, then POSTs the code, with its client secret,
   to the token endpoint, and gets an access token and a refresh token.
5. It calls the API with the access token. When that expires, it POSTs
   grant_type=refresh_token to get a new one, with no user involved.
```

`state` stops another site from forging step 3, and public clients such as mobile apps add
**PKCE** (a one-time secret created in step 1 and proved in step 4) because they can't keep a
client secret. The automation track uses these flows to connect to SaaS APIs; for now, recognise
them.

```quiz
question: A nightly job copies your own company's deals from its CRM into a spreadsheet. No person is involved. Which OAuth flow fits?
options:
  - Authorization code
  - Client credentials
  - Basic auth with a user's password
answer: 1
explain: "Client credentials is for a program acting as itself. Authorization code is for acting on behalf of a person who approves access in their browser."
```

## Keeping secrets out of logs

Secrets leak through URLs (covered above), log lines that dump headers, and reprs. httpx helps with
one of those: the repr of a `Headers` object masks `Authorization`. It doesn't know that your
API's own header is secret:

```python
import httpx

request = httpx.Request(
    "GET",
    "https://api.weather.example/v1/forecast",
    headers={"Authorization": "Bearer at_5f1c", "X-API-Key": "wk_live_9f2c41d8"},
)
print(request.headers)
```

Your own classes are the next leak. A dataclass puts every field in its repr, so a config object in
a log line or a traceback prints the key. `field(repr=False)` leaves it out:

```python
from dataclasses import dataclass, field


@dataclass
class WeatherConfig:
    base_url: str
    api_key: str = field(repr=False)


WeatherConfig("https://api.weather.example", "wk_live_9f2c41d8")
```

When you do need to say which key was used (to tell two environments apart, say), log a hint such
as the last four characters, `"...41d8"`, never the key.

> [!TIP]
> Test for leaks: capture every log record while your client succeeds **and** fails, and assert the
> secret appears in none of them. The fix drill in this lesson is graded exactly that way.

## Where this leaves you

Secrets come from the environment, travel in headers and never in URLs, and stay out of reprs and
logs. API keys and bearer tokens are fixed headers; basic auth is a base64-encoded username and
password; an `httpx.Auth` class puts all of it in one place and can react to a `401`. OAuth 2's
client credentials flow swaps a client ID and secret for a short-lived token, and its authorization
code flow does the same on behalf of a user. The drills finish with an `Auth` class that runs the
client credentials flow and refreshes its own token.
