from plp import hidden, test
from solution import trim_history


def call(call_id, name, **arguments):
    return {"id": call_id, "name": name, "arguments": arguments}


def result(call_id, content):
    return {"role": "tool", "tool_call_id": call_id, "content": content}


HISTORY = [
    {"role": "user", "content": "Why does my CSV export fail? Account C-301."},
    {"role": "assistant", "content": "", "tool_calls": [call("c1", "get_account", account_id="C-301")]},
    result("c1", '{"plan": "growth"}'),
    {"role": "assistant", "content": "", "tool_calls": [call("c2", "get_export_log", account_id="C-301"),
                                                        call("c3", "get_tickets", account_id="C-301")]},
    result("c2", '{"error": "row 88: invalid date 31/02/2026"}'),
    result("c3", '[{"id": "T-881", "subject": "Export fails"}]'),
    {"role": "assistant", "content": "Row 88 has an invalid date, 31/02/2026. Could you fix it and try again?"},
    {"role": "user", "content": "Fixed it. Can you check again?"},
    {"role": "assistant", "content": "", "tool_calls": [call("c4", "get_export_log", account_id="C-301")]},
    result("c4", '{"status": "ok", "rows": 1204}'),
    {"role": "assistant", "content": "It worked: 1,204 rows exported."},
]


def assert_valid(history):
    called = set()
    for message in history:
        for tool_call in message.get("tool_calls") or []:
            called.add(tool_call["id"])
        if message["role"] == "tool":
            assert message["tool_call_id"] in called, (
                f"The trimmed history has a result for {message['tool_call_id']} but not the call that asked for it"
            )


@test("Never starts on a tool result")
def _():
    trimmed = trim_history(HISTORY, keep_last=6)
    assert [m["role"] for m in trimmed] == ["user", "assistant", "user", "assistant", "tool", "assistant"]
    assert_valid(trimmed)


@test("Skips every result of a parallel call")
def _():
    trimmed = trim_history(HISTORY, keep_last=7)
    assert trimmed == [HISTORY[0], *HISTORY[6:]]
    assert_valid(trimmed)


@test("A cut on an assistant message keeps the whole group")
def _():
    trimmed = trim_history(HISTORY, keep_last=8)
    assert trimmed == [HISTORY[0], *HISTORY[3:]]
    assert_valid(trimmed)


@test("Every keep_last gives a valid history that starts with the task")
def _():
    for keep_last in range(1, 12):
        trimmed = trim_history(HISTORY, keep_last=keep_last)
        assert trimmed[0] == HISTORY[0]
        assert len(trimmed) <= keep_last + 1
        assert_valid(trimmed)


@hidden("Short histories come back whole, as a copy, and the input never changes")
def _():
    snapshot = [dict(m) for m in HISTORY]
    whole = trim_history(HISTORY, keep_last=10)
    assert whole == HISTORY and whole is not HISTORY
    trim_history(HISTORY, keep_last=2)
    assert HISTORY == snapshot
    assert trim_history(HISTORY, keep_last=2) == [HISTORY[0], HISTORY[10]]
