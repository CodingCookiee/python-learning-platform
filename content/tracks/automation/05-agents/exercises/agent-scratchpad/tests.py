import json

from plp import hidden, test
from plp_fakes import ScriptedLLM, tool_call
from solution import FINISH, TAKE_NOTE, NotesResult, run_with_notes

SYSTEM = "You prepare call briefs for Northwind's sales team. Take notes as you go."
TOOLS = [
    {"name": "get_crm_notes", "description": "Recent CRM notes for a company.",
     "parameters": {"type": "object", "properties": {"company_id": {"type": "string"}}, "required": ["company_id"]}},
    {"name": "search_news", "description": "Recent news headlines about a company.",
     "parameters": {"type": "object", "properties": {"company": {"type": "string"}}, "required": ["company"]}},
]
REGISTRY = {
    "get_crm_notes": lambda company_id: [{"date": "2026-09-12", "text": "Renewal in March. Wants SSO first."}],
    "search_news": lambda company: [{"title": f"{company} opens a second clinic in Leeds", "date": "2026-08-20"}],
}
TASK = "Prepare a call brief for Harbour Dental (C-301)."
NOTE = "Renewal in March; wants SSO first"
BRIEF = "Brief: Harbour Dental renews in March and wants SSO before then."


def notes_block(*notes):
    return "\n\nYour notes so far:\n" + ("\n".join(f"- {n}" for n in notes) or "(none yet)")


@test("Keeps notes and finishes, as in the example")
def _():
    llm = ScriptedLLM([
        tool_call("get_crm_notes", company_id="C-301"),
        tool_call("take_note", text=NOTE),
        tool_call("finish", answer=BRIEF),
    ])
    result = run_with_notes(llm, TASK, TOOLS, REGISTRY, system=SYSTEM)
    assert result == NotesResult(BRIEF, [NOTE], 3)
    assert [call["tools"] == [*TOOLS, TAKE_NOTE, FINISH] for call in llm.calls] == [True, True, True]


@test("Shows the notes in every call's system prompt")
def _():
    llm = ScriptedLLM([tool_call("take_note", text=NOTE), tool_call("take_note", text="Owner: Tom Reed"),
                       tool_call("finish", answer=BRIEF)])
    run_with_notes(llm, TASK, TOOLS, REGISTRY, system=SYSTEM)
    assert [call["system"] for call in llm.calls] == [
        SYSTEM + notes_block(),
        SYSTEM + notes_block(NOTE),
        SYSTEM + notes_block(NOTE, "Owner: Tom Reed"),
    ]


@test("take_note is answered by the loop")
def _():
    llm = ScriptedLLM([tool_call("take_note", text=NOTE), tool_call("finish", answer=BRIEF)])
    run_with_notes(llm, TASK, TOOLS, REGISTRY, system=SYSTEM)
    last = llm.calls[1]["messages"][-1]
    assert last["role"] == "tool" and json.loads(last["content"]) == {"saved": 1}


@test("Sends a trimmed history, but the notes survive")
def _():
    llm = ScriptedLLM([
        tool_call("take_note", text=NOTE),
        tool_call("search_news", company="Harbour Dental"),
        tool_call("get_crm_notes", company_id="C-301"),
        tool_call("search_news", company="Harbour Dental SSO"),
        tool_call("finish", answer=BRIEF),
    ])
    result = run_with_notes(llm, TASK, TOOLS, REGISTRY, system=SYSTEM, keep_last=4)
    last = llm.calls[4]
    assert last["messages"][0]["content"] == TASK
    assert len(last["messages"]) <= 5
    assert "take_note" not in json.dumps(last["messages"]), "The note's own messages should have been trimmed away"
    assert last["system"].endswith(f"- {NOTE}")
    assert result.notes == [NOTE]


@test("Stops at the step cap, keeping the notes")
def _():
    llm = ScriptedLLM([tool_call("take_note", text=NOTE)] + [tool_call("search_news", company="Harbour Dental")] * 2)
    assert run_with_notes(llm, TASK, TOOLS, REGISTRY, system=SYSTEM, max_steps=3) == NotesResult(None, [NOTE], 3)


@hidden("Plain replies end the run, and tool errors become observations")
def _():
    llm = ScriptedLLM([tool_call("get_crm_notes", id="C-301"), "Harbour Dental: renewal in March."])
    result = run_with_notes(llm, TASK, TOOLS, REGISTRY, system=SYSTEM)
    assert result == NotesResult("Harbour Dental: renewal in March.", [], 2)
    assert "error" in json.loads(llm.calls[1]["messages"][-1]["content"])
