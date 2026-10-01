"""Unit tests against the fakes: python -m pytest -q tests"""

import sys
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import harden as h  # noqa: E402
from plp_fakes import Fail, ScriptedLLM  # noqa: E402


def make(llm, **caps):
    tracer = h.Tracer()
    ledger = h.BudgetLedger(clock=lambda: datetime(2026, 10, 1, 12, tzinfo=timezone.utc), **caps)
    return h.harden(llm, tracer, ledger, ref_key=b"test-key"), tracer


def test_golden_set_loads_and_has_20_cases():
    cases = h.load_cases(h.GOLDEN_PATH.read_text(encoding="utf-8"))
    assert len(cases) >= 20


def test_load_cases_reports_the_line():
    with pytest.raises(ValueError, match="line 2"):
        h.load_cases('{"id": "a", "input": "q", "expected": "x", "scorer": "regex"}\n{oops')


def test_gate_names_newly_failing_cases():
    report = h.EvalReport([h.CaseResult("a", False, "", ""), *[h.CaseResult(str(i), True, "", "") for i in range(20)]])
    assert any("a" in reason for reason in h.gate(report, {"a": True}))


def test_answers_are_traced_without_content():
    answer, tracer = make(h.demo_llm())
    assert "14 days" in answer("How long do refunds take?", "ada@example.com")
    flat = repr([s.attributes for s in tracer.spans])
    assert "@" not in flat and "refunds take" not in flat
    assert [s.name for s in tracer.spans] == ["answer", "llm.complete"]


def test_spent_budget_returns_the_fallback():
    llm = h.demo_llm()
    answer, tracer = make(llm, per_user_daily=Decimal("0.002"))
    results = [answer("How long do refunds take?", "u_1") for _ in range(20)]
    assert results[-1] == h.FALLBACK_ANSWER
    spent = sum(s.attributes["cost_usd"] for s in tracer.spans if s.name == "llm.complete")
    assert spent <= Decimal("0.002")


def test_outage_returns_the_fallback():
    answer, tracer = make(ScriptedLLM([Fail(529)], repeat_last=True))
    assert answer("How long do refunds take?", "u_1") == h.FALLBACK_ANSWER
    assert tracer.spans[0].attributes["outcome"] == "error"


def test_red_team_all_contained():
    answer, _ = make(h.demo_llm())
    assert all(f["passed"] for f in h.run_red_team(lambda q: answer(q, "rt"), h.ATTACKS))


def test_sanitize_compares_hostnames():
    text = h.sanitize("a https://kiln.example.collector.example/ b https://collector.example/?kiln.example c https://track.kiln.example/1")
    assert "collector" not in text and "https://track.kiln.example/1" in text


def test_service():
    from fastapi.testclient import TestClient

    client = TestClient(h.create_app(lambda q, user: "hi", service_api_key="k" * 20, checks={"config": lambda: True}))
    assert client.get("/healthz").status_code == 200
    assert client.get("/readyz").status_code == 200
    assert client.post("/v1/answer", json={"question": "q"}).status_code == 401
    assert client.post("/v1/answer", json={"question": "q"}, headers={"X-API-Key": "k" * 20}).json() == {"answer": "hi"}
