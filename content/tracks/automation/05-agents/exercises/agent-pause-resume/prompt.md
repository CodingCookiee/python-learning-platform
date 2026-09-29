The on-call helper may suggest restarting a service, and a person has to approve that in Slack,
maybe hours later. Don't keep a process waiting: pause, save the run as JSON, and resume when the
answer arrives.

```python
start_run(llm, task, tools, registry, *, risky, max_steps=8) -> Outcome
resume_run(llm, state, *, approved, tools, registry, risky, max_steps=8) -> Outcome
```

The loop is lesson 2's (offer `[*tools, FINISH]`; `finish` gives `"finished"` with its answer, a
plain reply gives `"no_finish"` with its text, and after `max_steps` model calls in total it's
`"step_limit"`). Tool results are JSON, and a tool that raises gives `{"error": str(error)}`.

- **Pause.** When a response contains any call to a tool in `risky`, append the assistant message
  and return `Outcome("paused", state=..., pending=...)` **without running any call in that
  response**. `state` is a JSON string of `{"messages": ..., "pending": ..., "steps": ...}`: the
  history so far, every call in that response (as `{"id", "name", "arguments"}` dicts), and the
  model calls made. `pending` is the list of the risky calls among them.
- **Resume.** `resume_run` loads the state (a JSON string, possibly in another process), appends
  one result per pending call, in order, then carries on the loop. A risky call runs only when
  `approved` is true; otherwise its result is `{"error": DECLINED}`, with `{name}` filled in.
  Other calls always run. The step count carries on from the saved one.

```python
outcome = start_run(llm, "checkout-api is failing", TOOLS, REGISTRY, risky={"restart_service"})
outcome.status, outcome.pending   # ("paused", [{"id": "call_...", "name": "restart_service", "arguments": {"service": "checkout-api"}}])
# ...hours later, a person clicks Approve...
resume_run(llm2, outcome.state, approved=True, tools=TOOLS, registry=REGISTRY, risky={"restart_service"})
```
