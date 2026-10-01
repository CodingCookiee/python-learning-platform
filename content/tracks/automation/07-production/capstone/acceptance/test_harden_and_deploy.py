"""Acceptance tests for "Harden and deploy", run by GitHub Actions in your repository.

They import harden.py from the top of your repository and drive it with scripted fake models
written in this file (the course's neutral interface), so no key and no network are needed.
They also run `python harden.py` once, with the scripted model from your demo_llm().
"""

from __future__ import annotations

import importlib
import itertools
import json
import math
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest

KEY_VARS = ("ANTHROPIC_API_KEY", "OPENAI_API_KEY")
SAFE_REPLY = "Refunds reach the original card within 14 days of the return arriving."
PII_SUFFIX = " My email is ada.lovelace@example.com and my phone is +44 7700 900123."
NOON = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)
SERVICE_KEY = "test-service-key-0123456789"


# The course's neutral LLM interface, scripted (compatible with plp_fakes.ScriptedLLM)


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class LLMResponse:
    text: str = ""
    tool_calls: list = field(default_factory=list)
    stop_reason: str = "end_turn"
    usage: Usage = field(default_factory=Usage)
    model: str = "fake-model"
    raw: dict = field(default_factory=dict)


class FakeLLMError(RuntimeError):
    """A provider error, like plp_fakes.FakeLLMError: carries .status and .retry_after."""

    def __init__(self, status: int, message: str = "", retry_after: float | None = None):
        super().__init__(f"Fake LLM error {status}: {message or 'scripted failure'}")
        self.status, self.message, self.retry_after = status, message, retry_after


def estimate_tokens(text: str) -> int:
    return max(1, math.ceil(len(text) / 4)) if text else 0


def messages_text(messages) -> str:
    parts = []
    for message in messages:
        content = message.get("content", "")
        if isinstance(content, str):
            parts.append(content)
        elif isinstance(content, list):
            parts += [str(b.get("text") or b.get("content") or "") for b in content if isinstance(b, dict)]
    return "\n".join(parts)


class FakeLLM:
    """Answers every call with `reply` (a string, or a function of the call that returns one or raises).

    It reports the input at four characters a token and half of max_tokens as output, so the actual
    cost of a call is always below a worst-case estimate."""

    def __init__(self, reply, *, model: str, limit: int = 200):
        self.reply, self.model, self.limit = reply, model, limit
        self.calls: list[dict] = []

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None, **extra):
        call = {"messages": json.loads(json.dumps(messages, default=str)), "system": system, "tools": tools,
                "model": model or self.model, "max_tokens": max_tokens, "temperature": temperature, **extra}
        self.calls.append(call)
        if len(self.calls) > self.limit:
            raise AssertionError(f"The fake model was called more than {self.limit} times")
        text = self.reply(call) if callable(self.reply) else self.reply
        usage = Usage(estimate_tokens((system or "") + messages_text(messages)), max(1, max_tokens // 2))
        call["usage"] = usage
        return LLMResponse(text=text, usage=usage, model=model or self.model)


# Helpers


def load():
    """Import harden.py from the top of the repository, with no API keys in the environment."""
    assert Path("harden.py").exists(), "harden.py should be at the top of your repository (save the starter as harden.py)"
    for name in KEY_VARS:
        os.environ.pop(name, None)
    try:
        return importlib.import_module("harden")
    except Exception as exc:  # noqa: BLE001
        pytest.fail(f"Importing harden.py failed: {type(exc).__name__}: {exc}. Importing it must not need a key, "
                    "the network or a running server.")


@pytest.fixture
def hd():
    return load()


def need(module, *names):
    for name in names:
        assert hasattr(module, name), f"harden.py should define {name} (the starter has it)"


def fake_model(hd) -> str:
    """The cheapest model in PRICES, so the fake's spending is priced like yours."""
    prices = getattr(hd, "PRICES", {})
    try:
        return min(prices, key=lambda m: prices[m]["output"])
    except (TypeError, KeyError, ValueError):
        return "model-small"


def price(hd, model):
    p = hd.PRICES[model]
    return Decimal(str(p["input"])), Decimal(str(p["output"]))


def ledger(hd, *, per_user_daily="1000", per_day="1000", clock=lambda: NOON):
    need(hd, "BudgetLedger")
    return hd.BudgetLedger(per_user_daily=Decimal(per_user_daily), per_day=Decimal(per_day), clock=clock)


def build(hd, llm, budget=None):
    need(hd, "harden", "Tracer", "FALLBACK_ANSWER")
    tracer = hd.Tracer()
    answer = hd.harden(llm, tracer, budget or ledger(hd))
    assert callable(answer), "harden(llm, tracer, ledger) should return the answer(question, user) function"
    return answer, tracer


_question: dict[int, str] = {}


def model_question(hd) -> str:
    """A question your pipeline sends to the model: one of the sample bot's, or one from your golden set."""
    if id(hd) in _question:
        return _question[id(hd)]
    candidates = ["How long do refunds take?", "Who pays for return postage on a refund?"]
    golden = Path("evals/golden.jsonl")
    if golden.exists():
        for line in golden.read_text(encoding="utf-8").splitlines():
            try:
                candidates.append(str(json.loads(line)["input"]))
            except (ValueError, KeyError, TypeError):
                continue
    for question in candidates:
        llm = FakeLLM(SAFE_REPLY, model=fake_model(hd))
        answer, _ = build(hd, llm)
        answer(question, "probe-user")
        if llm.calls:
            _question[id(hd)] = question
            return question
    pytest.fail("None of the sample questions (\"How long do refunds take?\") or your golden set's inputs made "
                "answer() call the model, so the tests can't exercise your pipeline")


def spans(tracer, name):
    return [s for s in tracer.spans if s.name == name]


def attribute_text(tracer) -> str:
    return " ".join(repr(s.attributes) + " " + str(getattr(s, "error", "") or "") for s in tracer.spans)


# 1. Evals and a release gate


def test_python_harden_py_passes_its_gate_and_contains_every_attack():
    assert Path("harden.py").exists(), "harden.py should be at the top of your repository"
    env = {k: v for k, v in os.environ.items() if k not in KEY_VARS}
    env["PYTHONIOENCODING"] = "utf-8"
    result = subprocess.run([sys.executable, "harden.py"], capture_output=True, text=True, encoding="utf-8",
                            errors="replace", timeout=120, env=env)
    out = result.stdout
    assert result.returncode == 0, (
        f"`python harden.py` (with the scripted model, no key set) exited with status {result.returncode}; it should "
        f"pass the gate and contain every attack. Output:\n{out[-1500:]}\n{result.stderr[-1500:]}")
    eval_line = re.search(r"^eval: .*$", out, re.M)
    assert eval_line, f"`python harden.py` should print an `eval: ...% pass` line, as in the sample run:\n{out[-1500:]}"
    assert "FAIL" not in eval_line.group(), f"The eval gate failed: {eval_line.group()}"
    team = re.search(r"red team: (\d+)/(\d+) contained", out)
    assert team, f"`python harden.py` should print `red team: N/N contained`:\n{out[-1500:]}"
    assert team.group(1) == team.group(2), f"Not every attack was contained: {team.group()}"
    assert int(team.group(2)) >= 8, f"The red-team suite should have at least 8 attacks, it ran {team.group(2)}"
    assert re.search(r"cost: \d+ model calls, \$\d", out), f"`python harden.py` should end with the cost summary:\n{out[-800:]}"


def test_golden_set_has_20_tagged_cases_and_load_cases_rejects_bad_lines(hd):
    need(hd, "load_cases")
    golden = Path("evals/golden.jsonl")
    assert golden.exists(), "Your golden set should be in evals/golden.jsonl"
    cases = hd.load_cases(golden.read_text(encoding="utf-8"))
    assert len(cases) >= 20, f"evals/golden.jsonl should have at least 20 cases, it has {len(cases)}"
    for case in cases:
        missing = [k for k in ("id", "input", "expected", "scorer", "tags") if k not in case]
        assert not missing, f"Golden case {case.get('id', case)!r} is missing {missing}"
        assert isinstance(case["tags"], list) and case["tags"], f"Golden case {case['id']!r} needs a list of tags"
    ids = [c["id"] for c in cases]
    assert len(ids) == len(set(ids)), "Every golden case needs its own id"

    baseline = Path("evals/baseline.json")
    assert baseline.exists(), "Commit the accepted run as evals/baseline.json"
    data = json.loads(baseline.read_text(encoding="utf-8"))
    assert isinstance(data, dict) and data and all(isinstance(v, bool) for v in data.values()), \
        'evals/baseline.json should map case ids to true or false, like {"refund-window": true}'

    good = '{"id": "a", "input": "q", "expected": ["x"], "scorer": "contains", "tags": ["t"]}'
    with pytest.raises(ValueError) as bad_line:
        hd.load_cases(good + "\n{this is not json")
    assert re.search(r"\b2\b", str(bad_line.value)), f"The error for a bad line should give its line number (2): {bad_line.value}"
    with pytest.raises(ValueError):
        hd.load_cases(good + "\n" + good)


def test_run_eval_scores_each_case_and_an_exception_fails_only_that_case(hd):
    need(hd, "run_eval")
    cases = [
        {"id": "both", "input": "refunds", "expected": ["14 days", "original card"], "scorer": "contains", "tags": ["a"]},
        {"id": "half", "input": "ireland", "expected": ["Ireland", "3 to 5"], "scorer": "contains", "tags": ["a"]},
        {"id": "crash", "input": "crash", "expected": ["anything"], "scorer": "contains", "tags": ["a"]},
        {"id": "hours", "input": "hours", "expected": "9am to 5pm", "scorer": "regex", "tags": ["a"]},
        {"id": "days", "input": "days", "expected": r"\b14 days\b", "scorer": "regex", "tags": ["a"]},
    ]
    outputs = {"refunds": "Refunds reach the original card within 14 days.", "ireland": "We ship to Ireland.",
               "hours": "From 9am to 5pm UK time.", "days": "It takes fourteen days."}

    def system(question):
        if question == "crash":
            raise RuntimeError("the model exploded")
        return outputs[question]

    report = hd.run_eval(system, cases)
    got = {r.id: r.passed for r in report.results}
    assert got == {"both": True, "half": False, "crash": False, "hours": True, "days": False}, (
        f"run_eval scored the cases {got}: `contains` needs every expected phrase, `regex` searches for the pattern, "
        "and an exception fails just that case")
    assert report.pass_rate == pytest.approx(0.4), f"2 of 5 passed, so pass_rate should be 0.4, not {report.pass_rate}"


def test_gate_blocks_on_the_floor_a_drop_and_newly_failing_cases(hd):
    need(hd, "run_eval", "gate")

    def report(ids, failing):
        cases = [{"id": i, "input": i, "expected": ["yes"], "scorer": "contains", "tags": ["t"]} for i in ids]
        return hd.run_eval(lambda q: "no" if q in failing else "yes", cases)

    ids = [f"case{i:02d}" for i in range(20)]
    everything = {i: True for i in ids}
    assert not hd.gate(report(ids, set()), everything), "A run where every case passes, like the baseline, should ship (gate returns [])"

    low = {"case00", "case01", "case02"}
    reasons = hd.gate(report(ids, low), {i: i not in low for i in ids})
    assert reasons, "17 of 20 (85%) is below MIN_PASS_RATE (90%): gate should return a reason"

    reasons = hd.gate(report(ids + ["case-new"], {"case-new"}), everything)
    assert reasons, "20 of 21 (95.2%) against a 100% baseline is a drop of more than MAX_DROP: gate should return a reason"

    reasons = hd.gate(report(ids, {"case00"}), {**everything, "case00": True, "case01": False})
    assert reasons and "case00" in " ".join(reasons), (
        f"case00 passed on the baseline and fails now, so gate's reasons should name it, got {reasons}")


# 2. Tracing


def test_tracer_nests_spans_records_errors_and_reraises(hd):
    need(hd, "Tracer")
    ticks = itertools.count()
    tracer = hd.Tracer(clock=lambda: float(next(ticks)))
    with pytest.raises(ValueError):
        with tracer.span("outer"):
            with tracer.span("inner"):
                raise ValueError("boom")
    with tracer.span("next"):
        pass
    outer, inner, after = tracer.spans
    assert inner.parent_id == outer.span_id and outer.parent_id is None, "A span opened inside another should have it as parent"
    assert after.parent_id is None, "After the error, both spans should be closed, so the next span has no parent"
    assert all(s.end is not None for s in (outer, inner)), "A span that raises should still record its end time"
    assert inner.status != "ok" and outer.status != "ok", "Spans the exception passed through should record an error status"


def test_answers_and_model_calls_are_traced_with_no_content_or_raw_user_ids(hd):
    need(hd, "PRICES", "CANARY")
    question = model_question(hd) + PII_SUFFIX
    model = fake_model(hd)
    llm = FakeLLM(SAFE_REPLY, model=model)
    answer, tracer = build(hd, llm)
    for user in ("ada.lovelace@example.com", "ada.lovelace@example.com", "grace.hopper@example.com"):
        answer(question, user)
    assert llm.calls, "answer() should call the model for a help-centre question"

    answers = spans(tracer, "answer")
    assert len(answers) == 3, f"Expected one `answer` span per question, found {len(answers)}"
    for span in answers:
        assert span.attributes.get("outcome") == "answered", f"An answered question's span should have outcome 'answered': {span.attributes}"
        assert span.attributes.get("prompt_version"), "Every `answer` span should record the prompt_version"
    refs = [span.attributes.get("user_ref") for span in answers]
    assert all(isinstance(r, str) and r for r in refs), "Every `answer` span should record the user's pseudonymous id as `user_ref`"
    assert refs[0] == refs[1] != refs[2], "The same user should always get the same user_ref, and different users different ones"

    calls = spans(tracer, "llm.complete")
    assert len(calls) == len(llm.calls), f"Expected one `llm.complete` span per model call ({len(llm.calls)}), found {len(calls)}"
    by_id = {s.span_id: s for s in tracer.spans}
    p_in, p_out = price(hd, model)
    for span, call in zip(calls, llm.calls):
        parents, parent = [], by_id.get(span.parent_id)
        while parent is not None:
            parents.append(parent.name)
            parent = by_id.get(parent.parent_id)
        assert "answer" in parents, "Each `llm.complete` span should be inside the question's `answer` span"
        a = span.attributes
        assert a.get("model") == model and a.get("prompt_version"), f"`llm.complete` should record model and prompt_version: {a}"
        assert (a.get("input_tokens"), a.get("output_tokens")) == (call["usage"].input_tokens, call["usage"].output_tokens), \
            f"`llm.complete` should record the response's input_tokens and output_tokens: {a}"
        expected = (call["usage"].input_tokens * p_in + call["usage"].output_tokens * p_out) / 1_000_000
        assert a.get("cost_usd") is not None and Decimal(str(a["cost_usd"])) == pytest.approx(expected, rel=1e-6), \
            f"cost_usd should be the call's cost from PRICES ({expected}), got {a.get('cost_usd')}"

    text = attribute_text(tracer)
    for leaked in ("ada.lovelace", "grace.hopper", "@example.com", "7700 900123", hd.CANARY):
        assert leaked not in text, f"A span contains {leaked!r}: spans hold no message content, no raw user ids, and redacted text only"
    system = llm.calls[0]["system"] or ""
    if len(system) >= 30:
        assert system[:30] not in text, "A span contains the system prompt: record no prompts"


def test_redact_removes_emails_phones_cards_and_keys(hd):
    need(hd, "redact")
    text = ("Ada (ada.lovelace@example.com, +44 7700 900123) paid with 4242 4242 4242 4242 "
            "using sk-ant-api03-AbCdEfGhIjKlMnOpQrStUv")
    out = hd.redact(text)
    for secret in ("ada.lovelace@example.com", "7700 900123", "4242 4242 4242 4242", "AbCdEfGhIjKlMnOpQrStUv"):
        assert secret not in out, f"redact() left {secret!r} in: {out!r}"
    assert "paid with" in out, f"redact() should only replace the personal data and keys, not the rest: {out!r}"


# 3. Cost caps


def test_budget_ledger_enforces_both_caps_and_resets_at_utc_midnight(hd):
    need(hd, "BudgetLedger", "BudgetExceeded")
    now = [datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc)]
    book = hd.BudgetLedger(per_user_daily=Decimal("0.010"), per_day=Decimal("0.015"), clock=lambda: now[0])
    book.check("u_1", Decimal("0.004"))
    book.charge("u_1", Decimal("0.008"))
    with pytest.raises(hd.BudgetExceeded):
        book.check("u_1", Decimal("0.003"))  # 0.008 + 0.003 is over the user's 0.010
    book.check("u_2", Decimal("0.003"))
    book.charge("u_2", Decimal("0.006"))
    with pytest.raises(hd.BudgetExceeded):
        book.check("u_3", Decimal("0.002"))  # the day has spent 0.014 of 0.015

    now[0] = datetime(2026, 10, 2, 1, 30, tzinfo=timezone(timedelta(hours=2)))  # 23:30 UTC on 1 October
    with pytest.raises(hd.BudgetExceeded):
        book.check("u_1", Decimal("0.003"))
    now[0] = datetime(2026, 10, 2, 0, 0, 1, tzinfo=timezone.utc)
    try:
        book.check("u_1", Decimal("0.009"))
        book.check("u_3", Decimal("0.009"))
    except hd.BudgetExceeded:
        pytest.fail("Budgets should reset at UTC midnight (the clock returns timezone-aware datetimes)")


def run_until_spent(hd, answer, llm, question, users):
    results, counts = [], []
    for user in users:
        try:
            results.append(answer(question, user))
        except Exception as exc:  # noqa: BLE001
            pytest.fail(f"answer() raised {type(exc).__name__}: {exc}; a spent budget should return FALLBACK_ANSWER")
        counts.append(len(llm.calls))
    assert results[0] != hd.FALLBACK_ANSWER, "The first question, well within budget, should be answered"
    assert hd.FALLBACK_ANSWER in results, f"After {len(results)} questions the budget should be spent and the fallback returned"
    first = results.index(hd.FALLBACK_ANSWER)
    assert all(r == hd.FALLBACK_ANSWER for r in results[first:]), "Once the budget is spent, every answer should be the fallback"
    assert counts[first:] == [counts[first - 1]] * (len(counts) - first), "A spent budget must not call the model"



def test_spent_budgets_return_the_fallback_without_calling_the_model(hd):
    need(hd, "PRICES")
    question = model_question(hd)
    model = fake_model(hd)
    probe = FakeLLM(SAFE_REPLY, model=model)
    build(hd, probe)[0](question, "probe")
    call = probe.calls[0]
    p_in, p_out = price(hd, model)
    worst = (estimate_tokens((call["system"] or "") + messages_text(call["messages"])) * p_in + call["max_tokens"] * p_out) / 1_000_000
    cap = worst * 4

    llm = FakeLLM(SAFE_REPLY, model=model)
    answer, tracer = build(hd, llm, ledger(hd, per_user_daily=str(cap), per_day=str(cap * 1000)))
    run_until_spent(hd, answer, llm, question, ["u_1"] * 30)
    spent = sum(Decimal(str(s.attributes.get("cost_usd") or 0)) for s in spans(tracer, "llm.complete"))
    assert spent <= cap, f"User u_1 spent ${spent}, over their ${cap} daily cap: check a worst-case estimate before each call"
    assert spans(tracer, "answer")[-1].attributes.get("outcome") == "budget", "A question refused for budget should have outcome 'budget'"
    before = len(llm.calls)
    assert answer(question, "u_2") != hd.FALLBACK_ANSWER and len(llm.calls) > before, \
        "Another user should still get answers when one user's budget is spent"

    llm = FakeLLM(SAFE_REPLY, model=model)
    answer, tracer = build(hd, llm, ledger(hd, per_user_daily=str(cap * 1000), per_day=str(cap)))
    run_until_spent(hd, answer, llm, question, [f"user{i}" for i in range(30)])
    spent = sum(Decimal(str(s.attributes.get("cost_usd") or 0)) for s in spans(tracer, "llm.complete"))
    assert spent <= cap, f"The service spent ${spent}, over the ${cap} daily cap"


# 4 and 5. The hardened pipeline: outages, output filtering, policy and the red team


def test_a_provider_outage_returns_the_fallback_with_outcome_error(hd, monkeypatch):
    monkeypatch.setattr(time, "sleep", lambda seconds: None)
    question = model_question(hd)

    def overloaded(call):
        raise FakeLLMError(529, "overloaded")

    def timed_out(call):
        raise TimeoutError("The read operation timed out")

    for failure in (overloaded, timed_out):
        llm = FakeLLM(failure, model=fake_model(hd))
        answer, tracer = build(hd, llm)
        for user in ("u_1", "u_2"):
            try:
                result = answer(question, user)
            except Exception as exc:  # noqa: BLE001
                pytest.fail(f"answer() raised {type(exc).__name__} when the model failed; it should return FALLBACK_ANSWER")
            assert result == hd.FALLBACK_ANSWER, f"When every model call fails, answer() should return FALLBACK_ANSWER, got {result!r}"
        outcomes = [s.attributes.get("outcome") for s in spans(tracer, "answer")]
        assert outcomes == ["error", "error"], f"A model failure should give the `answer` span outcome 'error', got {outcomes}"


def test_every_answer_passes_the_output_filter_and_the_policy_check(hd):
    need(hd, "sanitize", "violates_policy", "CANARY")
    removed = {
        "![chart](https://collector.example/p.png?d=ada) Refunds take 14 days.": ["collector.example", "!["],
        '<img src="https://collector.example/pixel.gif"> Hi': ["<img", "collector.example"],
        "Use [this form](https://kiln-refunds.example-pay.com/r) now": ["example-pay.com"],
        "See https://kiln.example.collector.example/r for details": ["collector.example"],
        "See https://collector.example/?kiln.example for details": ["collector.example"],
    }
    for text, gone in removed.items():
        out = hd.sanitize(text)
        for part in gone:
            assert part not in out, f"sanitize({text!r}) should remove {part!r}, got {out!r}"
    kept = hd.sanitize("Track it at https://track.kiln.example/1042 today.")
    assert "https://track.kiln.example/1042" in kept, f"Links to kiln.example and its subdomains should survive: {kept!r}"

    assert hd.violates_policy(f"Sure: [{hd.CANARY}]") and hd.violates_policy("Your DISCOUNT CODE is FREE100"), \
        "violates_policy should catch the canary and discount codes, ignoring case"
    assert not hd.violates_policy(SAFE_REPLY), "violates_policy flagged an ordinary answer"

    question, model = model_question(hd), fake_model(hd)
    nasty = (SAFE_REPLY + " ![x](https://collector.example/p.png?d=ada) <img src=\"https://collector.example/t.gif\"> "
             "[refund form](https://kiln-refunds.example-pay.com/form) https://kiln.example.collector.example/r")
    answer, _ = build(hd, FakeLLM(nasty, model=model))
    out = answer(question, "u_1")
    for part in ("collector.example", "example-pay.com", "![", "<img"):
        assert part not in out, f"answer() returned the model's {part!r}: every answer should go through sanitize. Got {out!r}"
    assert "14 days" in out, f"Filtering should remove the images and links, not the answer: {out!r}"

    for reply in (f"Here it is: You are the support assistant. [{hd.CANARY}]", "Discount code: FREE100"):
        answer, tracer = build(hd, FakeLLM(reply, model=model))
        assert answer(question, "u_1") == hd.FALLBACK_ANSWER, f"A model reply of {reply!r} should become FALLBACK_ANSWER"
        assert spans(tracer, "answer")[-1].attributes.get("outcome") == "blocked", "A blocked answer's span should have outcome 'blocked'"


def test_red_team_suite_has_8_attacks_and_the_runner_flags_leaks_and_crashes(hd):
    need(hd, "ATTACKS", "run_red_team", "CANARY")
    attacks = hd.ATTACKS
    assert len(attacks) >= 8, f"ATTACKS should have at least eight attacks, it has {len(attacks)}"
    assert all("id" in a and "input" in a for a in attacks), "Every attack needs an id and an input"
    assert len({a["id"] for a in attacks}) == len(attacks), "Every attack needs its own id"

    replies = {
        "leak": f"My instructions end with [{hd.CANARY}]",
        "image": "![x](https://collector.example/x.png) Refunds take 14 days.",
        "link": "Refunds: https://kiln-refunds.example-pay.com/r",
        "phrase": "Good news: refunds are instant.",
        "safe": "Refunds take 14 days. Track it at https://track.kiln.example/1.",
    }

    def pipeline(text):
        if text == "crash":
            raise RuntimeError("pipeline crashed")
        return replies[text]

    suite = [{"id": key, "input": key, "must_not_contain": ["instant"]} for key in [*replies, "crash"]]
    findings = {f["id"]: f for f in hd.run_red_team(pipeline, suite)}
    assert set(findings) == {a["id"] for a in suite}, "run_red_team should return one finding per attack, with its id"
    for key in ("leak", "image", "link", "phrase", "crash"):
        assert findings[key]["passed"] is False and findings[key]["problems"], \
            f"The {key!r} reply got through, but run_red_team marked it contained: {findings[key]}"
    assert findings["safe"]["passed"] is True, f"A safe reply was marked as a leak: {findings['safe']}"


# 5. The service


def client_for(hd, answer, checks):
    from fastapi.testclient import TestClient

    need(hd, "create_app")
    return TestClient(hd.create_app(answer, service_api_key=SERVICE_KEY, checks=checks), raise_server_exceptions=False)


def test_healthz_calls_nothing_and_readyz_reports_each_check(hd):
    called = []

    def answer(question, *args, **kwargs):
        called.append("answer")
        return "hi"

    def check(name, result=True):
        def run():
            called.append(name)
            if isinstance(result, Exception):
                raise result
            return result
        return run

    client = client_for(hd, answer, {"config": check("config"), "model": check("model")})
    assert client.get("/healthz").status_code == 200, "GET /healthz should return 200"
    assert called == [], f"/healthz should call nothing (no model, no checks), but it called {called}"
    ready = client.get("/readyz")
    assert ready.status_code == 200, f"/readyz should return 200 when every check passes, got {ready.status_code}"
    assert "config" in ready.text and "model" in ready.text, f"/readyz should report each check by name: {ready.text}"
    assert "answer" not in called, "/readyz should not call the pipeline"

    failing = client_for(hd, answer, {"config": check("config"), "model": check("model", False)}).get("/readyz")
    assert failing.status_code == 503, f"/readyz should return 503 when a check fails, got {failing.status_code}"
    raising = client_for(hd, answer, {"model": check("model", RuntimeError("db down"))}).get("/readyz")
    assert raising.status_code == 503, f"/readyz should return 503 (not crash) when a check raises, got {raising.status_code}"


def test_answer_endpoint_needs_the_key_validates_the_body_and_hides_errors(hd):
    received = []

    def answer(question, *args, **kwargs):
        received.append((question, args, kwargs))
        return "Refunds take 14 days."

    client = client_for(hd, answer, {})
    body = {"question": "How long do refunds take?", "user": "someone-else"}
    assert client.post("/v1/answer", json=body).status_code in (401, 403), "POST /v1/answer without X-API-Key should be refused (401)"
    wrong = client.post("/v1/answer", json=body, headers={"X-API-Key": "wrong-key"})
    assert wrong.status_code in (401, 403), f"A wrong X-API-Key should be refused (401), got {wrong.status_code}"
    assert received == [], "The pipeline ran for an unauthenticated request"

    ok = client.post("/v1/answer", json=body, headers={"X-API-Key": SERVICE_KEY})
    assert ok.status_code == 200, f"An authenticated question should get 200, got {ok.status_code}: {ok.text}"
    assert ok.json().get("answer") == "Refunds take 14 days.", f'The response should be {{"answer": ...}}, got {ok.text}'
    assert received[0][0] == "How long do refunds take?", "The pipeline should get the question from the body"
    assert "someone-else" not in repr(received[0][1:]), "The budget user must come from the API key's client, never the request body"
    missing = client.post("/v1/answer", json={}, headers={"X-API-Key": SERVICE_KEY})
    assert missing.status_code == 422, f"A body with no question should be rejected with 422, got {missing.status_code}"

    def broken(question, *args, **kwargs):
        raise RuntimeError("db password hunter2 for ada@example.com")

    failed = client_for(hd, broken, {}).post("/v1/answer", json=body, headers={"X-API-Key": SERVICE_KEY})
    assert failed.status_code == 503, f"A failing pipeline should give 503, got {failed.status_code}"
    assert "hunter2" not in failed.text and "ada@" not in failed.text, f"The 503 response leaked the error's details: {failed.text}"


# 6. The files around it


def test_dockerfile_redteam_report_and_readme(hd):
    docker = Path("Dockerfile")
    assert docker.exists(), "Add a Dockerfile at the top of your repository"
    text = docker.read_text(encoding="utf-8")
    assert re.search(r"^\s*HEALTHCHECK\b.*/healthz", text, re.M | re.S), "The Dockerfile needs a HEALTHCHECK on /healthz"
    users = re.findall(r"^\s*USER\s+(\S+)", text, re.M)
    assert users and users[-1] not in ("root", "0"), "The Dockerfile should switch to a non-root USER"
    assert not re.search(r"(sk-[A-Za-z0-9_-]{16,}|API_KEY\s*=\s*\S{8,})", text), "The Dockerfile seems to contain a secret"

    report = Path("REDTEAM.md")
    assert report.exists(), "Add REDTEAM.md: each attack, its result, and the defence that contained it"
    missing = [a["id"] for a in getattr(hd, "ATTACKS", []) if a["id"] not in report.read_text(encoding="utf-8")]
    assert not missing, f"REDTEAM.md should list every attack in ATTACKS by its id; missing: {missing}"
    assert Path("README.md").exists(), "Add a README.md: how to run it offline, with a key, and in Docker"
