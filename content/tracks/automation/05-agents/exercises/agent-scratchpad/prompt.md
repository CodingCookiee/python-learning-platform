The sales research assistant prepares call briefs, and a thorough brief takes a dozen steps. Its
history is trimmed to stay small, so it keeps forgetting what it found. Give it a scratchpad:

```python
run_with_notes(llm, task, tools, registry, *, system, max_steps=8, keep_last=4) -> NotesResult
```

It's the agent loop, with a `take_note` tool (`TAKE_NOTE` in the starter) whose notes live outside
the history:

- Every call offers `[*tools, TAKE_NOTE, FINISH]`, and sends `trim_history(messages,
  keep_last=keep_last)` (in the starter) instead of the whole history. Your own `messages` list
  keeps everything.
- Every call's system prompt is `system`, a blank line, `Your notes so far:`, then one line per
  note as `- <note>`, or the line `(none yet)` when there are none.
- A `take_note(text)` call isn't in the registry: your loop adds the text to the notes and answers
  with `{"saved": <number of notes>}` as JSON.
- Other calls run from the registry, with errors returned as `{"error": str(error)}`.
- `finish(answer)` returns `NotesResult(answer, notes, steps)`; a plain reply returns
  `NotesResult(text, notes, steps)`; the step cap returns `NotesResult(None, notes, max_steps)`.

```python
llm = ScriptedLLM([
    tool_call("get_crm_notes", company_id="C-301"),
    tool_call("take_note", text="Renewal in March; wants SSO first"),
    tool_call("finish", answer="Brief: Harbour Dental renews in March and wants SSO before then."),
])
result = run_with_notes(llm, "Prepare a call brief for Harbour Dental (C-301).", TOOLS, REGISTRY, system=SYSTEM)
result.notes                                  # ["Renewal in March; wants SSO first"]
llm.calls[2]["system"].endswith("- Renewal in March; wants SSO first")   # True
```
