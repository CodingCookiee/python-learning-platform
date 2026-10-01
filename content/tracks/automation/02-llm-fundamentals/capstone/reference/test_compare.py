"""Tests for the comparison harness, with the course's fakes: no network, no key."""

from decimal import Decimal

import httpx

from compare import CASES, SYSTEM, FakeClock, ModelResult, Target, build_messages, evaluate, offline_targets, recommend, run_comparison
from llm import AnthropicClient, OpenAIClient
from plp_fakes import Fail, ScriptedLLM, anthropic_api, openai_api


def expected_label_for(content):
    return next(case.expected for case in CASES if case.ticket in content)


def answer(body):
    return expected_label_for(body["messages"][-1]["content"])


def test_evaluate_scores_counts_errors_and_sends_the_same_prompt():
    llm = ScriptedLLM(["billing", "Delivery.", Fail(529), "other"])
    result = evaluate(Target("fake/fake", llm, "fake"), CASES[:4], clock=FakeClock())
    assert result.scores == [1.0, 1.0, 0.0, 0.0]
    assert result.errors == 1
    assert len(result.latencies_ms) == 3
    for case, call in zip(CASES, llm.calls):
        assert call["system"] == SYSTEM
        assert call["messages"] == build_messages(case)
        assert call["temperature"] == 0
        assert call["max_tokens"] == 5


def test_offline_models_are_timed_with_the_shared_clock():
    clock = FakeClock()
    result = evaluate(offline_targets(clock)[0], CASES, clock=clock)
    assert round(result.median_ms) == 425
    assert round(result.p90_ms) == 450


def test_run_comparison_through_both_adapters():
    anthropic = anthropic_api([Fail(429, retry_after=1)] + [answer] * len(CASES))
    openai = openai_api([answer] * len(CASES))
    sleeps = []
    targets = [
        Target(
            "anthropic/claude-test",
            AnthropicClient(
                httpx.Client(transport=anthropic.transport, base_url="https://api.anthropic.com"),
                api_key="test-key",
                model="claude-test",
                sleep=sleeps.append,
            ),
            "claude-test",
        ),
        Target(
            "openai/gpt-test",
            OpenAIClient(
                httpx.Client(transport=openai.transport, base_url="https://api.openai.com"),
                api_key="test-key",
                model="gpt-test",
                sleep=sleeps.append,
            ),
            "gpt-test",
        ),
    ]
    prices = {"claude-test": {"input": Decimal("1"), "output": Decimal("5")}}
    a, o = run_comparison(targets, CASES, prices=prices, clock=FakeClock())
    assert sleeps == [1.0]
    assert (a.quality, a.errors) == (1.0, 0)
    assert (o.quality, o.errors) == (1.0, 0)
    assert a.cost > 0
    assert o.cost is None
    assert anthropic.last["json"]["system"] == SYSTEM
    assert openai.last["json"]["messages"][0] == {"role": "system", "content": SYSTEM}


def made(label, scores, latency, cost):
    return ModelResult(label, label, scores=scores, latencies_ms=[latency], cost=cost)


def test_recommend_nothing_qualifies():
    slow = made("slow", [1.0] * 10, 5000, Decimal("0.01"))
    assert recommend([slow], min_quality=0.9, max_latency_ms=1500) is None


def test_recommend_tie_on_cost_prefers_quality():
    ok = made("ok", [1.0] * 9 + [0.0], 500, Decimal("0.01"))
    best = made("best", [1.0] * 10, 500, Decimal("0.01"))
    assert recommend([ok, best], min_quality=0.9, max_latency_ms=1500) is best


def test_recommend_skips_a_model_without_a_price():
    unpriced = made("unpriced", [1.0] * 10, 500, None)
    weak = made("weak", [0.0] * 10, 500, Decimal("0.001"))
    assert recommend([unpriced, weak], min_quality=0.9, max_latency_ms=1500) is None
