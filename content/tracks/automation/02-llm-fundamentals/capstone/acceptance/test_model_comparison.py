"""Acceptance tests for the model comparison harness, run by GitHub Actions in your repository.

They import llm.py and compare.py from the top of your repository and run them against fakes
written in this file: a scripted model with the course's complete() interface, and fakes of the
Anthropic and OpenAI HTTP APIs plugged into httpx.Client through httpx.MockTransport. No keys,
no network, no real waiting: every sleep and clock is injected.
"""

import difflib
import importlib
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import httpx
import pytest

ANTHROPIC_URL = "https://api.anthropic.com"
OPENAI_URL = "https://api.openai.com"

SAMPLE_REPORT = """\
Ticket categories: 12 cases, temperature 0

Model                          Quality  Median ms  p90 ms  Errors      Cost   Per 1k
------------------------------------------------------------------------------------
offline/offline-small            75.0%        425     450       0   $0.0008    $0.07
offline/offline-medium           91.7%        905     930       0   $0.0040    $0.33
offline/offline-large            91.7%      2,075   2,100       1   $0.0175    $1.46
------------------------------------------------------------------------------------"""

RECOMMENDED = "Recommended: offline/offline-medium, the cheapest with quality of at least 90% and a median under 1,500 ms."
NONE_REACHED = "No model reached quality of at least 95% and a median under 1,000 ms."
NO_PRICE_NOTE = "Some models have no price: add them to your prices file."


# Loading your files


def load(name):
    """Import llm or compare from the top of the repository, with a clear message if it can't be."""
    if not Path(f"{name}.py").exists():
        pytest.fail(f"{name}.py should be at the top of your repository", pytrace=False)
    try:
        return importlib.import_module(name)
    except Exception as exc:  # noqa: BLE001 - any import failure should read as a plain message
        pytest.fail(
            f"Importing {name}.py failed with {type(exc).__name__}: {exc}. "
            "Importing it must not need a key, a network or anything else set up.",
            pytrace=False,
        )


def no_key_env():
    env = {k: v for k, v in os.environ.items() if not k.endswith("_API_KEY") and not k.endswith("_MODELS")}
    env["PYTHONIOENCODING"] = "utf-8"
    return env


def run_compare(*args):
    assert Path("compare.py").exists(), "compare.py should be at the top of your repository"
    result = subprocess.run(
        [sys.executable, "compare.py", *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=60,
        env=no_key_env(),
    )
    assert result.returncode == 0, f"python compare.py {' '.join(args)} crashed:\n{result.stderr[-1500:]}"
    return [line.rstrip() for line in result.stdout.rstrip().splitlines()]


def same_lines(actual, expected, what):
    if actual != expected:
        diff = "\n".join(difflib.unified_diff(expected, actual, "expected", "yours", lineterm=""))
        pytest.fail(f"{what} doesn't match the brief line for line:\n{diff}", pytrace=False)


# A scripted model with the course's complete() interface (like plp_fakes.ScriptedLLM)


@dataclass
class Fail:
    status: int
    retry_after: float | None = None


class Timeout:
    pass


class FakeLLMError(RuntimeError):
    def __init__(self, status, retry_after=None):
        super().__init__(f"Fake LLM error {status}: scripted failure")
        self.status = status
        self.retry_after = retry_after


@dataclass
class FakeUsage:
    input_tokens: int
    output_tokens: int


@dataclass
class FakeResponse:
    text: str
    tool_calls: list
    stop_reason: str
    usage: FakeUsage
    model: str


class ManualClock:
    """Like the starter's FakeClock: it only moves when a fake model takes time."""

    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


class ScriptedLLM:
    """Answers from a script, in order. .calls records each complete() call's arguments."""

    def __init__(self, replies, *, clock=None, latencies_ms=(), usage=(10, 1)):
        self.replies = list(replies)
        self.clock = clock
        self.latencies_ms = list(latencies_ms)
        self.usage = usage
        self.calls = []

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        n = len(self.calls)
        self.calls.append({
            "messages": json.loads(json.dumps(messages)),
            "system": system,
            "tools": tools,
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
        })
        assert n < len(self.replies), f"The model was called {n + 1} times, but there are only {len(self.replies)} cases"
        if self.clock is not None and n < len(self.latencies_ms):
            self.clock.now += self.latencies_ms[n] / 1000
        reply = self.replies[n]
        if isinstance(reply, Fail):
            raise FakeLLMError(reply.status, reply.retry_after)
        return FakeResponse(reply, [], "end_turn", FakeUsage(*self.usage), model or "fake-model")


# Fakes of the two providers' HTTP APIs


def text_of(content):
    if isinstance(content, str):
        return content
    return " ".join(str(block.get("text") or block.get("content") or "") for block in content if isinstance(block, dict))


class FakeProviderAPI:
    """POST /v1/messages (Anthropic) or /v1/chat/completions (OpenAI), answering from a script.

    A script item is reply text, a Fail, a Timeout, {"raw": <response JSON>}, or a function of the
    request body returning one of those. The last item repeats if repeat_last is set. Each request
    moves the clock (if given) on by step seconds, and .requests records every one."""

    def __init__(self, kind, script, *, repeat_last=False, usage=(100, 1), clock=None, step=0.3, limit=25):
        self.kind = kind
        self.script = list(script)
        self.repeat_last = repeat_last
        self.usage = usage
        self.clock = clock
        self.step = step
        self.limit = limit
        self.requests = []

    def client(self):
        base = ANTHROPIC_URL if self.kind == "anthropic" else OPENAI_URL
        return httpx.Client(transport=httpx.MockTransport(self.handle), base_url=base)

    def error(self, status, message, headers=None):
        if self.kind == "anthropic":
            body = {"type": "error", "error": {"type": "api_error", "message": message}}
        else:
            body = {"error": {"type": "api_error", "message": message, "code": None}}
        return httpx.Response(status, json=body, headers=headers or {})

    def handle(self, request):
        headers = {k.lower(): v for k, v in request.headers.items()}
        body = json.loads(request.content or b"null")
        self.requests.append({"path": request.url.path, "headers": headers, "json": body})
        if len(self.requests) > self.limit:
            raise AssertionError(f"Your {self.kind} adapter sent more than {self.limit} requests: does it retry forever?")
        if self.clock is not None:
            self.clock.now += self.step

        if self.kind == "anthropic":
            if request.method != "POST" or request.url.path != "/v1/messages":
                return self.error(404, f"Unknown endpoint {request.method} {request.url.path}")
            if not headers.get("x-api-key") or not headers.get("anthropic-version"):
                return self.error(401, "x-api-key and anthropic-version headers are required")
            if not isinstance(body, dict) or "max_tokens" not in body or not body.get("model") or not body.get("messages"):
                return self.error(400, "model, max_tokens and messages are required")
            if any(isinstance(m, dict) and m.get("role") == "system" for m in body["messages"]):
                return self.error(400, 'messages: Unexpected role "system": use the top-level system parameter')
        else:
            if request.method != "POST" or request.url.path != "/v1/chat/completions":
                return self.error(404, f"Unknown endpoint {request.method} {request.url.path}")
            auth = headers.get("authorization", "")
            if not auth.startswith("Bearer ") or len(auth) <= len("Bearer "):
                return self.error(401, "Authorization: Bearer <key> header is required")
            if not isinstance(body, dict) or not body.get("model") or not body.get("messages"):
                return self.error(400, "model and messages are required")

        index = len(self.requests) - 1
        if index < len(self.script):
            item = self.script[index]
        elif self.repeat_last and self.script:
            item = self.script[-1]
        else:
            raise AssertionError(f"The fake {self.kind} API got more requests than the test scripted")
        if callable(item):
            item = item(body)
        if isinstance(item, Timeout):
            raise httpx.ReadTimeout("The read operation timed out", request=request)
        if isinstance(item, Fail):
            extra = {"retry-after": str(item.retry_after)} if item.retry_after is not None else {}
            return self.error(item.status, f"Error {item.status}", extra)
        if isinstance(item, dict):
            return httpx.Response(200, json=item["raw"])

        usage_in, usage_out = self.usage
        if self.kind == "anthropic":
            return httpx.Response(200, json={
                "id": "msg_fake",
                "type": "message",
                "role": "assistant",
                "model": body["model"],
                "content": [{"type": "text", "text": item}],
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {"input_tokens": usage_in, "output_tokens": usage_out},
            })
        return httpx.Response(200, json={
            "id": "chatcmpl_fake",
            "object": "chat.completion",
            "model": body["model"],
            "choices": [{"index": 0, "message": {"role": "assistant", "content": item}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": usage_in, "completion_tokens": usage_out, "total_tokens": usage_in + usage_out},
        })


def make_client(llm, cls_name, fake, *, api_key, model, sleep):
    cls = getattr(llm, cls_name, None)
    assert cls is not None, f"llm.py should define {cls_name}"
    try:
        return cls(fake.client(), api_key=api_key, model=model, sleep=sleep)
    except TypeError as exc:
        pytest.fail(
            f"{cls_name}(http, *, api_key, model, sleep=time.sleep) should be how it's built, "
            f"with sleep passed through to send_with_retries: {exc}",
            pytrace=False,
        )


def answer_for(compare):
    """A reply function that answers every case correctly, from the ticket in the last message."""

    def answer(body):
        last = text_of(body["messages"][-1]["content"])
        for case in compare.CASES:
            if case.ticket in last:
                return case.expected
        raise AssertionError(f"No ticket from CASES in the last message: {last!r}")

    return answer


def result(compare, label, scores, latencies, cost, errors=0):
    return compare.ModelResult(
        label, label.split("/")[-1], scores=list(scores), latencies_ms=list(latencies), errors=errors, cost=cost
    )


# The offline run


def test_offline_run_prints_the_sample_report():
    same_lines(run_compare("--offline"), [*SAMPLE_REPORT.splitlines(), RECOMMENDED], "python compare.py --offline")


def test_offline_run_with_stricter_bars_recommends_nothing():
    lines = run_compare("--offline", "--min-quality", "0.95", "--max-latency-ms", "1000")
    same_lines(
        lines,
        [*SAMPLE_REPORT.splitlines(), NONE_REACHED],
        "python compare.py --offline --min-quality 0.95 --max-latency-ms 1000",
    )


# The pure parts of compare.py


def test_build_messages_and_score():
    compare = load("compare")
    case = compare.CASES[0]
    assert compare.build_messages(case) == [{"role": "user", "content": f"<ticket>\n{case.ticket}\n</ticket>"}], (
        "build_messages(case) should return one user message: <ticket>, the ticket and </ticket>, each on its own line"
    )
    billing = compare.EvalCase("I was charged twice.", "billing")
    for reply in ["billing", "  Billing.\n", "BILLING!", "billing."]:
        assert compare.score(reply, billing) == 1.0, f"score({reply!r}) should be 1.0 when the expected label is billing"
    for reply in ["billing department", "delivery", "", "bill", "It's billing"]:
        assert compare.score(reply, billing) == 0.0, f"score({reply!r}) should be 0.0 when the expected label is billing"


def test_model_result_quality_and_nearest_rank_latencies():
    compare = load("compare")
    r = compare.ModelResult("x/m", "m", scores=[1.0, 0.0, 1.0, 1.0], latencies_ms=[40.0, 10.0, 30.0, 20.0])
    assert r.quality == pytest.approx(0.75), "quality should be the mean of scores"
    assert r.median_ms == 20.0, (
        "median_ms of [40, 10, 30, 20] should be 20: the nearest-rank percentile picks a value that was "
        "measured, it doesn't average the middle two"
    )
    assert r.p90_ms == 40.0, "p90_ms of [40, 10, 30, 20] should be 40 (nearest rank)"
    ten = compare.ModelResult("x/m", "m", scores=[1.0] * 10, latencies_ms=[5, 1, 4, 2, 3, 10, 9, 8, 7, 6])
    assert (ten.median_ms, ten.p90_ms) == (5, 9), "For latencies 1 to 10, median_ms should be 5 and p90_ms 9 (nearest rank)"
    none = compare.ModelResult("x/m", "m", scores=[0.0, 0.0], latencies_ms=[], errors=2)
    assert none.median_ms is None and none.p90_ms is None, "With no successful calls, median_ms and p90_ms should be None"
    r.cost = Decimal("0.002")
    assert r.cost_per_1000() == Decimal("0.5"), (
        "cost_per_1000() should be the run's cost divided by the number of cases, times 1,000 "
        "($0.002 over 4 cases is $0.50 per 1,000)"
    )
    r.cost = None
    assert r.cost_per_1000() is None, "cost_per_1000() should be None when there's no price"


def test_price_uses_reported_tokens_in_decimal():
    compare = load("compare")
    r = compare.ModelResult("anthropic/m-1", "m-1", input_tokens=2000, output_tokens=500)
    prices = {"m-1": {"input": Decimal("3.00"), "output": Decimal("15.00")}}
    cost = compare.price(r, prices)
    assert isinstance(cost, Decimal), f"price() should return a Decimal, not {type(cost).__name__}"
    assert cost == Decimal("0.0135"), (
        "2,000 input tokens at $3 and 500 output tokens at $15 per million should cost $0.0135, "
        f"but price() returned {cost}"
    )
    assert compare.price(r, {"other-model": prices["m-1"]}) is None, "price() should be None for a model not in prices"


def test_evaluate_sends_the_same_prompt_and_counts_failures():
    compare = load("compare")
    cases = compare.CASES[:5]  # billing, delivery, damaged, account, other
    clock = ManualClock()
    llm = ScriptedLLM(
        ["billing", "Delivery.", Fail(529), " ACCOUNT! ", "billing"],
        clock=clock,
        latencies_ms=[120, 340, 50, 910, 75],
    )
    r = compare.evaluate(compare.Target("fake/fake-model", llm, "fake-model"), cases, clock=clock)

    assert len(llm.calls) == 5, f"evaluate should call complete() once per case, and carry on after a failure: {len(llm.calls)} calls"
    for case, call in zip(cases, llm.calls):
        assert call["system"] == compare.SYSTEM, "Every call should pass system=SYSTEM"
        assert call["messages"] == compare.build_messages(case), "Every call should send build_messages(case)"
        assert call["model"] == "fake-model", "Every call should pass model=target.model"
        assert call["temperature"] == 0, "Every call should pass temperature=0"
        assert call["max_tokens"] == 5, "Every call should pass max_tokens=5"
    assert r.label == "fake/fake-model" and r.model == "fake-model", "The ModelResult should carry the target's label and model"
    assert r.scores == [1.0, 1.0, 0.0, 1.0, 0.0], f"Expected scores [1, 1, 0, 1, 0] (the failed call scores 0), got {r.scores}"
    assert r.errors == 1, f"One call raised, so errors should be 1, not {r.errors}"
    assert r.latencies_ms == pytest.approx([120, 340, 910, 75]), (
        "latencies_ms should hold each successful call's time from the injected clock, in milliseconds "
        f"(none for the failed call), got {r.latencies_ms}"
    )
    assert (r.input_tokens, r.output_tokens) == (40, 4), (
        "Token counts should add up the usage each successful reply reports (10 in and 1 out, 4 times), "
        f"got {r.input_tokens} in and {r.output_tokens} out"
    )


def test_recommend_follows_the_bars():
    compare = load("compare")
    perfect, ninety = [1.0] * 10, [1.0] * 9 + [0.0]
    big = result(compare, "p/big", perfect, [800], Decimal("0.010"))
    mid = result(compare, "p/mid", ninety, [1500], Decimal("0.004"))
    weak = result(compare, "p/weak", [1.0] * 5 + [0.0] * 5, [300], Decimal("0.001"))
    slow = result(compare, "p/slow", perfect, [3000], Decimal("0.002"))
    picked = compare.recommend([big, mid, weak, slow], min_quality=0.9, max_latency_ms=1500)
    assert picked is mid, (
        "recommend should pick the cheapest result with quality of at least min_quality and a median of at most "
        f"max_latency_ms (p/mid, exactly on both bars), not {getattr(picked, 'label', picked)}"
    )
    tie = result(compare, "p/tie", perfect, [900], Decimal("0.004"))
    picked = compare.recommend([mid, tie], min_quality=0.9, max_latency_ms=1500)
    assert picked is tie, "When two qualifying results cost the same, recommend should prefer the higher quality"
    assert compare.recommend([weak, slow], min_quality=0.9, max_latency_ms=1500) is None, (
        "recommend should return None when nothing meets both bars"
    )
    unpriced = result(compare, "p/unpriced", perfect, [500], None)
    assert compare.recommend([weak, unpriced], min_quality=0.9, max_latency_ms=1500) is None, (
        "recommend should return None when the only result that meets the bars has no price"
    )
    never = result(compare, "p/never", [0.0, 0.0], [], Decimal("0"), errors=2)
    assert compare.recommend([never], min_quality=0.0, max_latency_ms=1500) is None, (
        "A model with no successful calls has no median latency, so it can't be recommended (and mustn't crash)"
    )


def test_format_report_with_missing_prices_and_no_successes():
    compare = load("compare")
    unpriced = result(compare, "anthropic/claude-x", [1.0, 1.0, 0.0, 1.0], [1200.0, 1500.4, 900.0, 2000.0], None)
    failing = result(compare, "openai/gpt-x", [0.0] * 4, [], Decimal("0"), errors=4)
    text = compare.format_report([unpriced, failing], cases=compare.CASES[:4], min_quality=0.9, max_latency_ms=1500)
    assert isinstance(text, str), "format_report should return the report as one string"
    lines = [line.rstrip() for line in text.rstrip().splitlines()]
    rule = "-" * 84
    expected = [
        "Ticket categories: 4 cases, temperature 0",
        "",
        "Model                          Quality  Median ms  p90 ms  Errors      Cost   Per 1k",
        rule,
        f"{'anthropic/claude-x':<30}{'75.0%':>8}{'1,200':>11}{'2,000':>8}{'0':>8}{'n/a':>10}{'n/a':>9}",
        f"{'openai/gpt-x':<30}{'0.0%':>8}{'-':>11}{'-':>8}{'4':>8}{'$0.0000':>10}{'$0.00':>9}",
        rule,
        "No model reached quality of at least 90% and a median under 1,500 ms.",
        NO_PRICE_NOTE,
    ]
    same_lines(lines, expected, "The report for a model with no price and a model that never succeeded")


# The harness through your adapters


def test_run_comparison_through_both_adapters():
    llm, compare = load("llm"), load("compare")
    clock = ManualClock()
    answer = answer_for(compare)
    anthropic = FakeProviderAPI("anthropic", [Fail(429, retry_after=1), answer], repeat_last=True, clock=clock)
    bad_case = compare.CASES[4].ticket

    def openai_answer(body):
        return Fail(400) if bad_case in text_of(body["messages"][-1]["content"]) else answer(body)

    openai = FakeProviderAPI("openai", [openai_answer], repeat_last=True, clock=clock)
    anthropic_sleeps, openai_sleeps = [], []
    targets = [
        compare.Target(
            "anthropic/claude-test",
            make_client(llm, "AnthropicClient", anthropic, api_key="test-anthropic-key", model="claude-test", sleep=anthropic_sleeps.append),
            "claude-test",
        ),
        compare.Target(
            "openai/gpt-test",
            make_client(llm, "OpenAIClient", openai, api_key="test-openai-key", model="gpt-test", sleep=openai_sleeps.append),
            "gpt-test",
        ),
    ]
    prices = {"claude-test": {"input": Decimal("3.00"), "output": Decimal("15.00")}}
    results = compare.run_comparison(targets, compare.CASES, prices=prices, clock=clock)

    assert [r.label for r in results] == ["anthropic/claude-test", "openai/gpt-test"], "run_comparison should return one result per target, in order"
    a, o = results

    # Anthropic: one rate limit, retried inside the adapter, invisible to the harness
    assert anthropic_sleeps == [1.0], (
        "A 429 with retry-after: 1 should be retried by the adapter after sleeping 1 second "
        f"(through the injected sleep); the sleeps were {anthropic_sleeps}"
    )
    assert len(anthropic.requests) == 13, f"Expected 12 cases plus 1 retry to Anthropic, got {len(anthropic.requests)} requests"
    assert a.errors == 0 and a.quality == 1.0, f"The retried rate limit shouldn't reach the harness: errors {a.errors}, quality {a.quality}"
    assert sorted(round(x) for x in a.latencies_ms) == [300] * 11 + [600], (
        "Each call should be timed with the injected clock around complete(), including the adapter's retry "
        f"(the fake API takes 300 ms a request): got {a.latencies_ms}"
    )
    assert (a.input_tokens, a.output_tokens) == (1200, 12), (
        f"Tokens should add up the usage the API reported (100 in, 1 out per case): got {a.input_tokens} and {a.output_tokens}"
    )
    assert a.cost == Decimal("0.00378"), f"1,200 input tokens at $3 and 12 output at $15 per million cost $0.00378, not {a.cost}"
    for request in anthropic.requests:
        body = request["json"]
        assert body.get("system") == compare.SYSTEM, "The Anthropic request should carry SYSTEM as the top-level system parameter"
        assert body.get("temperature") == 0 and body.get("max_tokens") == 5 and body.get("model") == "claude-test", (
            "The Anthropic request should have temperature 0, max_tokens 5 and the target's model"
        )

    # OpenAI: a 400 is not retried, becomes one error, and the run carries on
    assert openai_sleeps == [], f"A 400 means the request is wrong: the adapter shouldn't retry it (it slept {openai_sleeps})"
    assert len(openai.requests) == 12, f"Expected exactly one request per case to OpenAI, got {len(openai.requests)}"
    assert o.errors == 1, f"The 400 should reach the harness as one error, not {o.errors}"
    assert o.quality == pytest.approx(11 / 12), f"With one error and 11 right answers, quality should be 11/12, not {o.quality}"
    assert len(o.latencies_ms) == 11, "Latencies should only be recorded for successful calls"
    assert o.cost is None, "gpt-test isn't in prices, so its cost should be None"
    for request in openai.requests:
        body = request["json"]
        messages = body.get("messages", [])
        assert messages[:1] == [{"role": "system", "content": compare.SYSTEM}], "The OpenAI request should start with SYSTEM as a system message"
        assert body.get("temperature") == 0 and body.get("model") == "gpt-test", "The OpenAI request should have temperature 0 and the target's model"
        assert 5 in (body.get("max_completion_tokens"), body.get("max_tokens")), "The OpenAI request should ask for at most 5 tokens"


def test_adapters_turn_failures_into_llm_errors():
    llm = load("llm")
    assert issubclass(getattr(llm, "LLMError", object), RuntimeError), "llm.py should define LLMError, a subclass of RuntimeError"
    message = [{"role": "user", "content": "Hi"}]

    sleeps = []
    fake = FakeProviderAPI("anthropic", [Fail(401)], repeat_last=True)
    client = make_client(llm, "AnthropicClient", fake, api_key="wrong-key", model="claude-test", sleep=sleeps.append)
    with pytest.raises(Exception) as caught:
        client.complete(message, max_tokens=10)
    assert isinstance(caught.value, llm.LLMError), f"A 401 should raise an LLMError, not {type(caught.value).__name__}: {caught.value}"
    assert getattr(caught.value, "status", None) == 401, "The LLMError for a 401 should have status 401"
    assert len(fake.requests) == 1 and sleeps == [], "A 401 can't succeed later, so it shouldn't be retried"

    sleeps = []
    fake = FakeProviderAPI("anthropic", [Fail(529)], repeat_last=True)
    client = make_client(llm, "AnthropicClient", fake, api_key="test-key", model="claude-test", sleep=sleeps.append)
    with pytest.raises(Exception) as caught:
        client.complete(message, max_tokens=10)
    assert isinstance(caught.value, llm.LLMError), (
        f"An API that stays overloaded (529) should end in an LLMError after a few retries, not {type(caught.value).__name__}: {caught.value}"
    )
    assert getattr(caught.value, "status", None) == 529, "The LLMError for a 529 should have status 529"
    assert len(fake.requests) >= 2 and len(sleeps) == len(fake.requests) - 1, (
        f"A 529 should be retried, sleeping before each retry: {len(fake.requests)} requests, {len(sleeps)} sleeps"
    )

    sleeps = []
    fake = FakeProviderAPI("openai", [Timeout(), "billing"])
    client = make_client(llm, "OpenAIClient", fake, api_key="test-key", model="gpt-test", sleep=sleeps.append)
    try:
        reply = client.complete(message, max_tokens=10)
    except Exception as exc:  # noqa: BLE001
        pytest.fail(f"A timeout followed by a good response should be retried and succeed, but it raised {type(exc).__name__}: {exc}", pytrace=False)
    assert reply.text == "billing" and len(sleeps) == 1, "A timeout should be retried once (one sleep) and then return the reply"


def test_adapters_translate_tools_history_and_replies():
    llm = load("llm")
    tool = {"name": "get_order", "description": "Look up an order", "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}}}
    history = [
        {"role": "user", "content": "Where's #1042?"},
        {"role": "assistant", "content": "", "tool_calls": [{"id": "call_1", "name": "get_order", "arguments": {"order_id": "1042"}}]},
        {"role": "tool", "tool_call_id": "call_1", "content": "Shipped Monday"},
    ]

    anthropic = FakeProviderAPI("anthropic", [{"raw": {
        "id": "msg_1", "type": "message", "role": "assistant", "model": "claude-test",
        "content": [{"type": "text", "text": "Let me check."}, {"type": "tool_use", "id": "toolu_1", "name": "get_order", "input": {"order_id": "7"}}],
        "stop_reason": "tool_use", "stop_sequence": None, "usage": {"input_tokens": 50, "output_tokens": 20},
    }}])
    client = make_client(llm, "AnthropicClient", anthropic, api_key="test-key", model="claude-test", sleep=lambda s: None)
    reply = client.complete(history, system="Be brief.", tools=[tool], max_tokens=100)
    body = anthropic.requests[0]["json"]
    assert body["system"] == "Be brief." and body["tools"] == [
        {"name": "get_order", "description": "Look up an order", "input_schema": tool["parameters"]}
    ], "AnthropicClient should send system at the top level and tools with their schema under input_schema"
    blocks = json.dumps(body["messages"])
    assert '"tool_use"' in blocks and '"tool_result"' in blocks, "AnthropicClient should turn tool calls and results into tool_use and tool_result blocks"
    assert reply.text == "Let me check." and reply.stop_reason == "tool_use", "AnthropicClient should return the text and stop_reason"
    call = reply.tool_calls[0]
    assert (call.id, call.name, call.arguments) == ("toolu_1", "get_order", {"order_id": "7"}), "AnthropicClient should return tool_use blocks as ToolCalls"
    assert (reply.usage.input_tokens, reply.usage.output_tokens, reply.model) == (50, 20, "claude-test"), "AnthropicClient should return usage and model"

    openai = FakeProviderAPI("openai", [{"raw": {
        "id": "c1", "object": "chat.completion", "model": "gpt-test",
        "choices": [{"index": 0, "finish_reason": "tool_calls", "message": {"role": "assistant", "content": None, "tool_calls": [
            {"id": "call_9", "type": "function", "function": {"name": "get_order", "arguments": "{\"order_id\": \"7\"}"}}
        ]}}],
        "usage": {"prompt_tokens": 60, "completion_tokens": 15, "total_tokens": 75},
    }}, {"raw": {
        "id": "c2", "object": "chat.completion", "model": "gpt-test",
        "choices": [{"index": 0, "finish_reason": "length", "message": {"role": "assistant", "content": "It shipped"}}],
        "usage": {"prompt_tokens": 70, "completion_tokens": 5, "total_tokens": 75},
    }}])
    client = make_client(llm, "OpenAIClient", openai, api_key="test-key", model="gpt-test", sleep=lambda s: None)
    reply = client.complete(history, system="Be brief.", tools=[tool], max_tokens=100)
    body = openai.requests[0]["json"]
    assert body["tools"] == [{"type": "function", "function": {"name": "get_order", "description": "Look up an order", "parameters": tool["parameters"]}}], (
        "OpenAIClient should wrap each tool as {'type': 'function', 'function': {...}}"
    )
    roles = [m["role"] for m in body["messages"]]
    assert roles == ["system", "user", "assistant", "tool"], f"OpenAIClient should send system, user, assistant, tool messages, got {roles}"
    sent_call = body["messages"][2]["tool_calls"][0]["function"]
    assert json.loads(sent_call["arguments"]) == {"order_id": "1042"}, "OpenAIClient should send tool call arguments as a JSON string"
    assert reply.text == "" and reply.stop_reason == "tool_use", "OpenAIClient should map finish_reason tool_calls to stop_reason tool_use, with text ''"
    call = reply.tool_calls[0]
    assert (call.id, call.name, call.arguments) == ("call_9", "get_order", {"order_id": "7"}), "OpenAIClient should parse tool call arguments from JSON"
    reply = client.complete([{"role": "user", "content": "And now?"}], max_tokens=5)
    assert (reply.text, reply.stop_reason) == ("It shipped", "max_tokens"), "OpenAIClient should map finish_reason length to stop_reason max_tokens"
    assert (reply.usage.input_tokens, reply.usage.output_tokens) == (70, 5), "OpenAIClient should read usage from prompt_tokens and completion_tokens"


# Configuration from the environment


def test_make_llm_picks_the_provider_from_the_environment():
    llm = load("llm")
    assert hasattr(llm, "make_llm"), "llm.py should define make_llm(env=os.environ, *, http=None)"
    fake = FakeProviderAPI("openai", ["hello"])
    env = {"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "sk-test-secret-123", "OPENAI_MODEL": "gpt-env"}
    client = llm.make_llm(env, http=fake.client())
    assert isinstance(client, llm.OpenAIClient), "make_llm with LLM_PROVIDER=openai should return an OpenAIClient"
    assert "sk-test-secret-123" not in repr(client), "A client's repr must not show the API key"
    assert client.complete([{"role": "user", "content": "Hi"}]).text == "hello"
    assert fake.requests[0]["json"]["model"] == "gpt-env", "make_llm should use OPENAI_MODEL as the model"

    fake = FakeProviderAPI("anthropic", ["hello"])
    client = llm.make_llm({"ANTHROPIC_API_KEY": "test-key"}, http=fake.client())
    assert isinstance(client, llm.AnthropicClient), "make_llm should default to Anthropic"

    try:
        llm.make_llm({"LLM_PROVIDER": "openai", "OPENAI_MODEL": "gpt-env"}, http=fake.client())
    except (Exception, SystemExit) as exc:  # noqa: BLE001
        assert "OPENAI_API_KEY" in str(exc), f"The error for a missing key should name OPENAI_API_KEY, got: {exc}"
    else:
        pytest.fail("make_llm should fail when OPENAI_API_KEY isn't set", pytrace=False)


def test_real_targets_reads_keys_and_models_from_the_environment():
    llm, compare = load("llm"), load("compare")
    targets = compare.real_targets({"ANTHROPIC_API_KEY": "test-anthropic-key"})
    assert [(t.label, t.model) for t in targets] == [
        ("anthropic/claude-haiku-4-5", "claude-haiku-4-5"),
        ("anthropic/claude-sonnet-5", "claude-sonnet-5"),
    ], "With only ANTHROPIC_API_KEY set, real_targets should compare the default models, labelled provider/model"
    assert all(isinstance(t.llm, llm.AnthropicClient) for t in targets), "Anthropic targets should use your AnthropicClient"

    env = {
        "ANTHROPIC_API_KEY": "test-anthropic-key",
        "ANTHROPIC_MODELS": "claude-a, claude-b",
        "OPENAI_API_KEY": "test-openai-key",
        "OPENAI_MODELS": "gpt-a,gpt-b",
    }
    targets = compare.real_targets(env)
    assert [t.label for t in targets] == ["anthropic/claude-a", "anthropic/claude-b", "openai/gpt-a", "openai/gpt-b"], (
        "real_targets should read ANTHROPIC_MODELS and OPENAI_MODELS (comma-separated, spaces ignored), Anthropic first"
    )
    assert all(isinstance(t.llm, llm.OpenAIClient) for t in targets[2:]), "OpenAI targets should use your OpenAIClient"
    assert all(t.llm is not None for t in targets)


def test_real_targets_fails_clearly_without_keys_or_models(capsys):
    compare = load("compare")

    def failure(env):
        try:
            compare.real_targets(env)
        except (Exception, SystemExit) as exc:  # noqa: BLE001
            out = capsys.readouterr()
            return f"{exc} {out.out} {out.err}"
        pytest.fail(f"real_targets should fail with environment keys {sorted(env)}", pytrace=False)

    text = failure({})
    assert "--offline" in text, f"With no keys, real_targets should exit with a message suggesting --offline, got: {text.strip()}"
    text = failure({"OPENAI_API_KEY": "sk-test-secret-123"})
    assert "OPENAI_MODELS" in text, f"With OPENAI_API_KEY but no OPENAI_MODELS, the message should name OPENAI_MODELS, got: {text.strip()}"
    assert "sk-test-secret-123" not in text, "The error message must never include the key"


# Your own tests


def test_your_own_tests_pass():
    assert Path("test_compare.py").exists(), "test_compare.py (your tests, run with the course's fakes) should be at the top of your repository"
    run = subprocess.run(
        [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "test_compare.py"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=120,
        env=no_key_env(),
    )
    assert run.returncode == 0, f"python -m pytest test_compare.py should pass with no keys and no network:\n{run.stdout[-2000:]}{run.stderr[-500:]}"
