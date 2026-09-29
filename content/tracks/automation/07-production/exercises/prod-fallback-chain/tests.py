from plp import hidden, raises, test
from plp_fakes import Fail, FakeLLMError, ScriptedLLM, Timeout
from solution import SUPPORT_SYSTEM, AllProvidersDown, Answer, answer, cache_key

QUESTION = "How long do refunds take?"


@test("Falls back to the secondary like the example, and caches its answer")
def _():
    chain = [("primary", ScriptedLLM([Fail(529)])), ("secondary", ScriptedLLM(["Refunds take 14 days."]))]
    cache = {}
    assert answer(QUESTION, chain, cache) == Answer("Refunds take 14 days.", "secondary", False)
    assert cache == {"how long do refunds take?": "Refunds take 14 days."}


@test("When everything is down, a cached answer is served as stale")
def _():
    primary, secondary = ScriptedLLM(["Refunds take 14 days.", Timeout()]), ScriptedLLM([Fail(503)])
    chain = [("primary", primary), ("secondary", secondary)]
    cache = {}
    answer(QUESTION, chain, cache)
    assert answer(QUESTION, chain, cache) == Answer("Refunds take 14 days.", "cache", True)
    assert (len(primary.calls), len(secondary.calls)) == (2, 1)


@test("A bad request is raised at once, without trying the next model")
def _():
    secondary = ScriptedLLM(["never used"])
    chain = [("primary", ScriptedLLM([Fail(400, "max_tokens too large")])), ("secondary", secondary)]
    raises(FakeLLMError, answer, QUESTION, chain, {}, match="400")
    assert secondary.calls == []


@test("With nothing cached, AllProvidersDown lists every failure in order")
def _():
    chain = [("primary", ScriptedLLM([Fail(529)])), ("secondary", ScriptedLLM([Timeout()])), ("tertiary", ScriptedLLM([Fail(429)]))]
    with raises(AllProvidersDown, what="answer(QUESTION, chain, {})") as caught:
        answer(QUESTION, chain, {})
    assert [name for name, _error in caught.value.errors] == ["primary", "secondary", "tertiary"]
    assert isinstance(caught.value.errors[1][1], TimeoutError)


@hidden("The cache key collapses whitespace and folds case")
def _():
    assert cache_key("  How long do\n refunds   TAKE? ") == "how long do refunds take?"
    cache = {cache_key(QUESTION): "Refunds take 14 days."}
    chain = [("primary", ScriptedLLM([Fail(502)]))]
    assert answer("how long do  refunds take? ", chain, cache) == Answer("Refunds take 14 days.", "cache", True)


@hidden("Every option gets the question, the support prompt and temperature 0")
def _():
    primary, secondary = ScriptedLLM([Timeout()]), ScriptedLLM(["Yes, we ship to Ireland."])
    answer("Do you ship to Ireland?", [("primary", primary), ("secondary", secondary)], {})
    for fake in (primary, secondary):
        call = fake.calls[0]
        assert call["messages"] == [{"role": "user", "content": "Do you ship to Ireland?"}]
        assert (call["system"], call["temperature"]) == (SUPPORT_SYSTEM, 0)
