---
slug: llm-errors-and-retries
title: Errors, rate limits and retries
summary: Turn failed calls into typed errors, retry rate limits and server errors with backoff that honours Retry-After, set timeouts, and never retry a mistake.
minutes: 45
exercises:
  - llm-retry-delay
  - llm-error-types
  - llm-fix-retry-400
  - llm-send-with-retries
---

LLM APIs fail far more often than the databases and payment APIs you're used to. Providers run
close to capacity, so rate limits and "overloaded" responses are routine, and a single call can take
a minute. An automation that treats every failure as fatal breaks every afternoon; one that retries
everything turns a bad request into a hundred bad requests and a bill. This lesson sorts failures
into the ones worth retrying and the ones that aren't, and builds the retry loop your adapters use.
You met backoff in module 14; here it meets the two LLM APIs.

## What goes wrong, and what to do about it

Both providers use HTTP status codes the same way, and both put a message in the JSON body under
`error.message`:

| Status | Meaning | Retry? |
|--------|---------|--------|
| 400 | The request is invalid: a missing field, a bad role, a prompt too long for the context window | No: fix the request |
| 401, 403 | The key is missing, wrong, revoked, or not allowed to use this model | No: fix the configuration |
| 404, 413, 422 | Unknown model or endpoint, request too large, unprocessable | No |
| 429 | Rate limited: too many requests or tokens per minute, often with a `retry-after` header | Yes, after waiting |
| 500, 502, 503 | Something broke at the provider | Yes, with backoff |
| 529 | Anthropic is overloaded | Yes, with backoff |
| timeout, connection error | No response at all | Yes, with backoff |

The rule is short: **4xx means your request is wrong, so sending it again gives the same answer;
429 and 5xx mean the provider is busy or broken, so waiting can help.**

```python
import httpx

anthropic_error = httpx.Response(429, headers={"retry-after": "12"}, json={
    "type": "error", "error": {"type": "rate_limit_error", "message": "Number of request tokens has exceeded your per-minute rate limit"}})
openai_error = httpx.Response(400, json={
    "error": {"type": "invalid_request_error", "message": "Unrecognized request argument supplied: max_token", "code": None}})

[(r.status_code, r.headers.get("retry-after"), r.json()["error"]["message"]) for r in (anthropic_error, openai_error)]
```

> [!NOTE]
> The official SDKs also retry 408 (request timeout) and 409 (conflict). They're rare from LLM APIs;
> the drills stick to the table above.

## Errors your code can catch

`raise_for_status()` gives you an `httpx.HTTPStatusError` for everything, which callers can only
tell apart by digging into `.response.status_code`. A small hierarchy says what went wrong and
whether trying again could help, in terms any caller understands:

```python
import httpx


class LLMError(RuntimeError):
    retryable = False

    def __init__(self, message, *, status=None, retry_after=None):
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after


class AuthenticationError(LLMError): ...
class BadRequestError(LLMError): ...
class RateLimitError(LLMError): retryable = True
class ServerError(LLMError): retryable = True


def error_from_response(response):
    status = response.status_code
    kind = (AuthenticationError if status in (401, 403) else RateLimitError if status == 429
            else ServerError if status >= 500 else BadRequestError)
    message = response.json()["error"]["message"]
    return kind(f"{message} (HTTP {status})", status=status)


error = error_from_response(httpx.Response(529, json={"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}}))
type(error).__name__, error.retryable, str(error)
```

`LLMError` subclasses `RuntimeError`, like the error the course's `ScriptedLLM` raises for a scripted
failure, so code written against the fake handles real failures too. The drill makes
`error_from_response` robust: error bodies that aren't JSON (a proxy's HTML page, say), and the
`retry-after` header.

## Backoff, and honouring Retry-After

Here is the retry loop most people write first:

```python norun
# Wrong: retries everything, immediately, forever
while True:
    response = http.post("/v1/messages", headers=headers, json=body)
    if response.status_code == 200:
        break
```

It resends a 400 until someone notices, and when the provider is overloaded it adds to the load at
full speed, which is exactly what gets an account rate-limited harder. A good loop:

1. **Retries only what can succeed**: 429, 5xx and timeouts. Anything else raises at once.
2. **Waits longer each time**: `base × 2 ** attempt` (1 s, 2 s, 4 s, ...), capped at a maximum.
3. **Honours `retry-after`** when the provider sends one: it knows when your limit resets.
4. **Gives up** after a few attempts and raises the last error.
5. **Takes `sleep` as a parameter**, so tests run instantly and can check the waits.

```python
import httpx


def retry_delay(attempt, retry_after=None, *, base=1.0, cap=30.0):
    return retry_after if retry_after is not None else min(cap, base * 2 ** attempt)


def send_with_retries(send, *, max_attempts=4, sleep):
    for attempt in range(max_attempts):
        response = send()
        if response.status_code < 400:
            return response
        retryable = response.status_code == 429 or response.status_code >= 500
        if not retryable or attempt == max_attempts - 1:
            response.raise_for_status()
        retry_after = response.headers.get("retry-after")
        sleep(retry_delay(attempt, float(retry_after) if retry_after else None))


script = iter([httpx.Response(529), httpx.Response(429, headers={"retry-after": "7"}), httpx.Response(503), httpx.Response(200, text="ok")])
waits = []
response = send_with_retries(lambda: next(script), sleep=waits.append)
response.text, waits
```

The waits were 1 s (first failure, 1 × 2⁰), 7 s (the provider asked for it), then 4 s (third
failure, 1 × 2²). In production, add **jitter**, a random fraction of each delay, so a hundred
workers that failed together don't all retry in the same millisecond:
`delay * random.uniform(0.5, 1.0)`.

```quiz
question: A call fails with 400 "prompt is too long". What should the retry loop do?
options:
  - Wait and retry with exponential backoff
  - Retry once immediately in case it was a glitch
  - Raise straight away; the caller has to shorten the prompt
answer: 2
explain: "A 400 is the provider telling you the request is wrong. The identical request will fail identically, so retrying only wastes time and adds load. Trim the history (lesson 1) and send a different request."
```

## Timeouts

A model can take a minute to write a long reply, and a connection can hang forever. httpx's default
timeout is 5 seconds for every phase, which is too short for LLM calls and gives you
`httpx.ReadTimeout` on long replies. Set it deliberately: fail fast if you can't connect, and give
the model time to answer.

```python norun
http = httpx.Client(
    base_url="https://api.anthropic.com",
    timeout=httpx.Timeout(60.0, connect=5.0),   # 5 s to connect; 60 s for each read, write and pool wait
)
```

With streaming, the read timeout applies between chunks rather than to the whole reply, which is
another reason to stream long outputs. A timeout is worth retrying, but remember the provider may
have finished the work and billed you for it, so keep attempts low.

```python
import httpx


def hangs(request):
    raise httpx.ReadTimeout("The read operation timed out", request=request)


http = httpx.Client(transport=httpx.MockTransport(hangs), base_url="https://api.anthropic.com")
try:
    http.post("/v1/messages", json={})
except httpx.TimeoutException as error:
    outcome = f"{type(error).__name__}: {error}"
outcome
```

> [!JS]
> Coming from JavaScript: `fetch` has no timeout at all unless you pass
> `signal: AbortSignal.timeout(60_000)`. httpx always has one, so the question is only whether it's
> the right length.

## Put it in the adapters

The adapters from lesson 3 call `raise_for_status()`. Swap that for the retry loop and they get all
of this for free, for every automation that uses them:

```python norun
def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
    body = ...  # as before
    response = send_with_retries(
        lambda: self._http.post("/v1/messages", headers=self._headers(), json=body),
        sleep=self._sleep,   # time.sleep by default; a list's append in tests
    )
    return self._parse(response.json())
```

Only the adapter knows about HTTP; everything above it sees an `LLMResponse` or an `LLMError`. That's
the finished `llm.py` the capstone and the rest of the track build on.

## Where this leaves you

4xx errors mean the request is wrong and must not be retried; 429, 5xx, 529 and timeouts can
succeed later. Map responses to a small hierarchy of errors with a `retryable` flag, retry with
capped exponential backoff that defers to `retry-after`, take `sleep` as a parameter so it's
testable, and set timeouts that suit LLM calls. The drills build the delay calculation and the
error mapping, fix a loop that retries bad requests, and put it all together with timeouts.
