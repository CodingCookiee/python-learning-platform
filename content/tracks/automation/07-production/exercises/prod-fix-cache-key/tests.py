import re

from plp import hidden, test
from solution import cache_key

SYSTEM = "You are Kiln & Co's support bot."
QUESTION = [{"role": "user", "content": "How long do refunds take?"}]
TOOLS = [{"name": "get_order", "description": "Look up an order", "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}}}]


def base(**changes):
    args = {"model": "model-small", "system": SYSTEM, "messages": QUESTION, "tools": None, "temperature": 0, "max_tokens": 300}
    args.update(changes)
    return cache_key(args.pop("model"), args.pop("system"), args.pop("messages"), **args)


@test("A different model gives a different key, like the example")
def _():
    small = cache_key("model-small", SYSTEM, QUESTION, temperature=0)
    large = cache_key("model-large", SYSTEM, QUESTION, temperature=0)
    assert re.fullmatch(r"[0-9a-f]{64}", small), f"{small!r} isn't a SHA-256 hex digest"
    assert small != large


@test("The temperature and the system prompt are part of the key")
def _():
    assert base(temperature=0.7) != base()
    assert base(temperature=None) != base(temperature=0)
    assert base(system="You are Kiln & Co's warm, friendly support bot.") != base()


@test("Tools and max_tokens are part of the key")
def _():
    assert base(tools=TOOLS) != base()
    assert base(max_tokens=1024) != base()


@test("Equal requests share a key whatever order their keys are in")
def _():
    reordered_tools = [{"parameters": TOOLS[0]["parameters"], "description": "Look up an order", "name": "get_order"}]
    reordered_messages = [{"content": "How long do refunds take?", "role": "user"}]
    assert base(tools=TOOLS) == base(tools=reordered_tools, messages=reordered_messages)
    assert base() == base()


@hidden("A different conversation is a different key")
def _():
    follow_up = QUESTION + [{"role": "assistant", "content": "14 days."}, {"role": "user", "content": "And for Ireland?"}]
    assert base(messages=follow_up) != base()
    assert base(messages=[{"role": "user", "content": "How long do refunds take? "}]) != base()
