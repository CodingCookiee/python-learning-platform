from plp import hidden, raises, test
from solution import fit_history

SYSTEM = "You help Harbour Bikes customers."  # 9 tokens
CHAT = [
    {"role": "user", "content": "My order #1042 hasn't arrived."},  # 8
    {"role": "assistant", "content": "Sorry! It left our warehouse Monday."},  # 9
    {"role": "user", "content": "Can you check the tracking?"},  # 7
]


def copy(messages):
    return [dict(m) for m in messages]


@test("Keeps only what fits, like the example")
def _():
    assert fit_history(CHAT, system=SYSTEM, context_window=40, max_tokens=16) == [CHAT[2]]


@test("Keeps everything when it all fits")
def _():
    assert fit_history(CHAT, system=SYSTEM, context_window=100, max_tokens=50) == CHAT


@test("Drops an assistant message left at the front")
def _():
    # Budget 100 - 70 - 9 = 21: the last two messages fit (16), but the first kept one is the assistant's
    assert fit_history(CHAT, system=SYSTEM, context_window=100, max_tokens=70) == [CHAT[2]]


@test("Leaves the caller's list alone")
def _():
    chat = copy(CHAT)
    fit_history(chat, system=SYSTEM, context_window=40, max_tokens=16)
    assert chat == CHAT
    assert fit_history(chat, system=SYSTEM, context_window=100, max_tokens=50) is not chat


@test("Refuses when even the newest message doesn't fit")
def _():
    with raises(ValueError, match="doesn't fit", what="fit_history(chat, context_window=20, max_tokens=10)"):
        fit_history(CHAT, system=SYSTEM, context_window=20, max_tokens=10)


@hidden("Stops at the first message that doesn't fit, even if an older one would")
def _():
    chat = [
        {"role": "user", "content": "Hi"},  # 1
        {"role": "assistant", "content": "Hello! How can I help you with your bike today?"},  # 12
        {"role": "user", "content": "Brakes squeak."},  # 4
        {"role": "assistant", "content": "Try cleaning the rims."},  # 6
        {"role": "user", "content": "Done, thanks."},  # 4
    ]
    # Budget 50 - 20 - 9 = 21: 4 + 6 + 4 = 14 fit, the 12 doesn't, and the "Hi" must not be kept
    assert fit_history(chat, system=SYSTEM, context_window=50, max_tokens=20) == chat[2:]


@hidden("Works without a system prompt, and with an empty history")
def _():
    assert fit_history(CHAT, system=None, context_window=29, max_tokens=5) == CHAT
    assert fit_history(CHAT, system=None, context_window=25, max_tokens=5) == [CHAT[2]]
    assert fit_history([], system=SYSTEM, context_window=40, max_tokens=16) == []
