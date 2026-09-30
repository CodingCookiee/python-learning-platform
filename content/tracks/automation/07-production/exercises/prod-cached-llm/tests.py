from plp import hidden, test
from plp_fakes import Reply, ScriptedLLM, tool_call
from solution import CachedLLM

QUESTION = [{"role": "user", "content": "How long do refunds take?"}]
ANSWER = "Refunds reach your card within 14 days."


class Clock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


@test("Answers the example's repeat from the cache")
def _():
    fake = ScriptedLLM([ANSWER])
    llm = CachedLLM(fake, clock=lambda: 0.0)
    llm.complete(QUESTION, temperature=0)
    assert llm.complete(QUESTION, temperature=0).text == ANSWER
    assert (llm.hits, llm.misses, len(fake.calls)) == (1, 1, 1)


@test("Calls that aren't deterministic are never cached")
def _():
    fake = ScriptedLLM(["Within 14 days!", "Two weeks, give or take.", "About 14 days."])
    llm = CachedLLM(fake, clock=lambda: 0.0)
    llm.complete(QUESTION, temperature=0.7)
    llm.complete(QUESTION, temperature=0.7)
    llm.complete(QUESTION)
    assert (llm.bypassed, llm.hits, llm.misses, len(fake.calls)) == (3, 0, 0, 3)


@test("Entries expire after the TTL")
def _():
    clock = Clock()
    fake = ScriptedLLM([ANSWER, "Refunds now take 10 days."])
    llm = CachedLLM(fake, ttl=600, clock=clock)
    llm.complete(QUESTION, temperature=0)
    clock.now = 599
    assert llm.complete(QUESTION, temperature=0).text == ANSWER
    clock.now = 600
    assert llm.complete(QUESTION, temperature=0).text == "Refunds now take 10 days."
    assert (llm.hits, llm.misses) == (1, 2)


@test("Different models, prompts and limits are cached separately")
def _():
    fake = ScriptedLLM(["small", "large", "other prompt", "short"], model="model-small")
    llm = CachedLLM(fake, clock=lambda: 0.0)
    assert llm.complete(QUESTION, temperature=0).text == "small"
    assert llm.complete(QUESTION, model="model-large", temperature=0).text == "large"
    assert llm.complete(QUESTION, system="Be brief.", temperature=0).text == "other prompt"
    assert llm.complete(QUESTION, max_tokens=50, temperature=0).text == "short"
    assert llm.complete(QUESTION, model="model-small", temperature=0).text == "small"
    assert llm.hits == 1


@hidden("Truncated replies and tool calls are never stored")
def _():
    fake = ScriptedLLM([
        Reply("Refunds reach your", stop_reason="max_tokens"),
        Reply(tool_calls=[tool_call("get_order", order_id="1042")]),
        ANSWER,
        ANSWER,
    ])
    llm = CachedLLM(fake, clock=lambda: 0.0)
    for _ in range(4):
        llm.complete(QUESTION, temperature=0)
    assert (llm.hits, llm.misses, len(fake.calls)) == (1, 3, 3)


@hidden("Passes every argument through on a miss")
def _():
    fake = ScriptedLLM([ANSWER])
    tools = [{"name": "get_order", "description": "Look up an order", "parameters": {"type": "object"}}]
    CachedLLM(fake).complete(QUESTION, system="Policy.", tools=tools, model="model-large", max_tokens=300, temperature=0)
    call = fake.calls[0]
    assert (call["system"], call["tools"], call["model"], call["max_tokens"], call["temperature"]) == ("Policy.", tools, "model-large", 300, 0)
