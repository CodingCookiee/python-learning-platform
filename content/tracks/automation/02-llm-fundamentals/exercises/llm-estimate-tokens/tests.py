from plp import hidden, test
from solution import estimate_tokens, prompt_tokens


@test("Estimates a ticket and a whole request, like the example")
def _():
    assert estimate_tokens("Where is my order #1042?") == 6
    messages = [{"role": "user", "content": "Where is my order #1042?"}]
    assert prompt_tokens(messages, system="You are a support agent.") == 12


@test("Rounds a partial token up")
def _():
    assert estimate_tokens("Refund") == 2
    assert estimate_tokens("Hi!") == 1
    assert estimate_tokens("Thanks, Ada") == 3


@test("Empty text is zero tokens")
def _():
    assert estimate_tokens("") == 0


@test("Adds up every message, with or without a system prompt")
def _():
    messages = [
        {"role": "user", "content": "My parcel is late."},
        {"role": "assistant", "content": "Sorry to hear that. What's the order number?"},
        {"role": "user", "content": "1042"},
    ]
    assert prompt_tokens(messages) == 5 + 11 + 1
    assert prompt_tokens(messages, system="Be brief.") == 5 + 11 + 1 + 3


@hidden("Estimates each message separately, then adds")
def _():
    messages = [{"role": "user", "content": "a"}, {"role": "user", "content": "b"}]
    assert prompt_tokens(messages) == 2
    assert prompt_tokens([]) == 0
