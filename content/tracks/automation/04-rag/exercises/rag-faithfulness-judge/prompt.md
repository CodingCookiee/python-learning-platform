Ledgerline's eval should catch answers that say more than their sources do. Write
`judge_faithfulness(llm, answer, sources)`, which asks a judge model to list unsupported claims and
returns a `Verdict` (the dataclass in the starter).

**The request.** One call, with `system=JUDGE_SYSTEM` (in the starter), `temperature=0`, and one
user message holding the sources, numbered from 1, and the answer:

```text
<sources>
[1] Payment reminders are sent 3 and 10 days after the due date.
[2] You can turn reminders off for a single client in their settings.
</sources>

<answer>
Reminders go out 3 and 10 days after the due date [1], and a final one after 30 days.
</answer>
```

`sources` is a list of strings. With no sources, raise `ValueError` without calling the model.

**The reply** should be JSON: `{"unsupported": ["a final one after 30 days"]}`, with an empty list
when everything is supported.

- Return `Verdict(faithful=True, unsupported=[])` for an empty list, and
  `Verdict(faithful=False, unsupported=[...claims])` otherwise, each claim stripped of surrounding
  whitespace, empty ones dropped.
- A judge reply you can't read is a broken measurement, not a pass: if it isn't JSON, isn't an
  object with an `"unsupported"` list, or the list holds anything but strings, raise `ValueError`.

```python
llm = ScriptedLLM(['{"unsupported": ["a final one after 30 days"]}'])
judge_faithfulness(llm, answer, sources)
# Verdict(faithful=False, unsupported=["a final one after 30 days"])
```
