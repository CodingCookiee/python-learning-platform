from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import SUMMARY_PROMPT, compact, history_tokens, transcript


def call(call_id, name, **arguments):
    return {"id": call_id, "name": name, "arguments": arguments}


LOG = "2026-09-28 row 88: invalid date 31/02/2026. " * 20
HISTORY = [
    {"role": "user", "content": "Why does my CSV export fail? Account C-301."},
    {"role": "assistant", "content": "", "tool_calls": [call("c1", "get_account", account_id="C-301")]},
    {"role": "tool", "tool_call_id": "c1", "content": '{"plan": "growth", "owner": "Priya Shah"}'},
    {"role": "assistant", "content": "", "tool_calls": [call("c2", "get_export_log", account_id="C-301")]},
    {"role": "tool", "tool_call_id": "c2", "content": LOG},
    {"role": "assistant", "content": "Row 88 has an invalid date. Could you try exporting September only?"},
    {"role": "user", "content": "Tried September only, same error."},
    {"role": "assistant", "content": "", "tool_calls": [call("c3", "get_export_log", account_id="C-301")]},
    {"role": "tool", "tool_call_id": "c3", "content": LOG},
    {"role": "assistant", "content": "The same row fails. Fixing row 88's date should solve it."},
]
SUMMARY = "Account C-301 (growth plan, owner Priya Shah). Export fails on row 88: invalid date. Customer re-tried with September only."
TASK = HISTORY[0]["content"]


@test("Replaces the older messages with a summary")
def _():
    llm = ScriptedLLM([SUMMARY])
    result = compact(llm, HISTORY, keep_last=4, max_tokens=500)
    assert result[0] == {"role": "user", "content": f"{TASK}\n\nSummary of the conversation so far:\n{SUMMARY}"}
    assert result[1:] == HISTORY[6:]
    assert len(llm.calls) == 1


@test("The summary call gets the older messages as a transcript, and nothing recent")
def _():
    llm = ScriptedLLM([SUMMARY])
    compact(llm, HISTORY, keep_last=4, max_tokens=500)
    request = llm.calls[0]
    assert request["max_tokens"] == 400
    assert request["messages"] == [{"role": "user", "content":
                                    f"{SUMMARY_PROMPT}\n\n<transcript>\n{transcript(HISTORY[1:6])}\n</transcript>"}]


@test("A history within budget comes back unchanged, with no model call")
def _():
    assert history_tokens(HISTORY) < 3000
    result = compact(ScriptedLLM([]), HISTORY)
    assert result == HISTORY and result is not HISTORY


@test("Never keeps an orphaned tool result")
def _():
    llm = ScriptedLLM([SUMMARY])
    result = compact(llm, HISTORY, keep_last=2, max_tokens=500)
    assert [m["role"] for m in result] == ["user", "assistant"]
    assert "Tried September only" in llm.calls[0]["messages"][0]["content"]


@hidden("Strips the summary and leaves the input alone")
def _():
    snapshot = [dict(m) for m in HISTORY]
    result = compact(ScriptedLLM(["\n  " + SUMMARY + "  \n"]), HISTORY, keep_last=4, max_tokens=500)
    assert result[0]["content"].endswith(f"so far:\n{SUMMARY}")
    assert HISTORY == snapshot


@hidden("Exactly at the budget is still within it")
def _():
    assert compact(ScriptedLLM([]), HISTORY, max_tokens=history_tokens(HISTORY)) == HISTORY
