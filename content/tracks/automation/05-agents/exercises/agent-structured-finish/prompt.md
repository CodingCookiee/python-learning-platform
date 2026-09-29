The platform team wants the on-call helper's answer as data they can post to the incident channel,
not a paragraph. `FINISH` in the starter now takes the fields of the `Diagnosis` model. Write:

```python
run_agent(llm, task, tools, registry, *, system=None, max_steps=8, max_nudges=1) -> AgentResult
```

It's the loop from the core drill (the starter has the helpers, and `run_tool` for running a normal
call), with the final answer held to the schema:

- Offer `[*tools, FINISH]` on every call.
- **A valid finish** (its arguments pass `Diagnosis.model_validate`) stops the run:
  `AgentResult(<the Diagnosis>, "finished", steps, trace)`. Other calls in that response don't run.
- **An invalid finish** doesn't stop it. Append the assistant message, then a result for the
  `finish` call whose content is JSON `{"error": "finish arguments are invalid: ..."}` naming each
  failing field, and carry on. Any other calls in that response get the result
  `{"error": "Not run, because this turn called finish."}` (as JSON) and don't run.
- **A plain reply** with no tool calls gets a nudge: append the assistant message and a user message
  with `NUDGE`, and carry on. After `max_nudges` nudges, the next plain reply stops the run with
  `AgentResult(None, "no_finish", steps, trace)`.
- Normal tool calls run as before, with `run_tool`, and go in the trace.
- After `max_steps` model calls: `AgentResult(None, "step_limit", max_steps, trace)`.

```python
llm = ScriptedLLM([
    tool_call("get_recent_deploys", service="checkout-api"),
    tool_call("finish", summary="5xx errors since deploy d-4417", likely_cause="deploy",
              suggested_action="Roll back d-4417", evidence=["d-4417 deployed at 02:06"]),
])
result = run_agent(llm, "Alert: checkout-api 5xx rate is 7%.", TOOLS, REGISTRY)
result.stop_reason, result.answer.likely_cause   # ("finished", "deploy")
```
