from plp import hidden, test
from plp_fakes import Reply, ScriptedLLM, tool_call
from solution import run_tools

TOOLS = [
    {"name": "find_slots", "description": "Find free slots for a practitioner on a day.",
     "parameters": {"type": "object", "properties": {"practitioner": {"type": "string"}, "day": {"type": "string"}},
                    "required": ["practitioner", "day"]}},
]


def find_slots(practitioner, day):
    return {"Patel": ["14:30", "16:00"], "Okafor": ["09:00"]}.get(practitioner, [])


REGISTRY = {"find_slots": find_slots}
QUESTION = [{"role": "user", "content": "Is Dr Patel free on Thursday?"}]


@test("The second request has the assistant's tool call before the result")
def _():
    llm = ScriptedLLM([tool_call("find_slots", practitioner="Patel", day="2026-10-01"), "Dr Patel is free at 14:30 and 16:00."])
    assert run_tools(llm, QUESTION, TOOLS, REGISTRY) == "Dr Patel is free at 14:30 and 16:00."
    assert [m["role"] for m in llm.calls[1]["messages"]] == ["user", "assistant", "tool"]


@test("The assistant message carries the call, and the result points at it")
def _():
    call = tool_call("find_slots", practitioner="Patel", day="2026-10-01")
    llm = ScriptedLLM([call, "Dr Patel is free at 14:30 and 16:00."])
    run_tools(llm, QUESTION, TOOLS, REGISTRY)
    history = llm.calls[1]["messages"]
    assert [m["role"] for m in history] == ["user", "assistant", "tool"]
    assistant, result = history[1:]
    assert assistant == {
        "role": "assistant", "content": "",
        "tool_calls": [{"id": call.id, "name": "find_slots", "arguments": {"practitioner": "Patel", "day": "2026-10-01"}}],
    }
    assert result == {"role": "tool", "tool_call_id": call.id, "content": '["14:30", "16:00"]'}


@test("Two calls in one turn: one assistant message, then both results")
def _():
    patel = tool_call("find_slots", practitioner="Patel", day="2026-10-01")
    okafor = tool_call("find_slots", practitioner="Okafor", day="2026-10-01")
    llm = ScriptedLLM([Reply(text="Checking both diaries.", tool_calls=[patel, okafor]), "Both are free."])
    run_tools(llm, QUESTION, TOOLS, REGISTRY)
    history = llm.calls[1]["messages"]
    assert [m["role"] for m in history] == ["user", "assistant", "tool", "tool"]
    assert [m["tool_call_id"] for m in history[2:]] == [patel.id, okafor.id]
    assert history[1]["content"] == "Checking both diaries."


@hidden("Keeps every turn in order across several steps")
def _():
    first = tool_call("find_slots", practitioner="Patel", day="2026-10-01")
    second = tool_call("find_slots", practitioner="Patel", day="2026-10-02")
    llm = ScriptedLLM([first, second, "Friday at 14:30 is free."])
    run_tools(llm, QUESTION, TOOLS, REGISTRY)
    assert [m["role"] for m in llm.calls[2]["messages"]] == ["user", "assistant", "tool", "assistant", "tool"]
    assert llm.calls[2]["messages"][3]["tool_calls"][0]["id"] == second.id


@hidden("Doesn't add anything to the caller's list")
def _():
    question = [{"role": "user", "content": "Is Dr Patel free on Thursday?"}]
    run_tools(ScriptedLLM([tool_call("find_slots", practitioner="Patel", day="2026-10-01"), "Yes."]), question, TOOLS, REGISTRY)
    assert question == [{"role": "user", "content": "Is Dr Patel free on Thursday?"}]
