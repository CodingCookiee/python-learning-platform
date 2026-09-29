Overnight, the metrics API went down. The on-call helper's `get_error_rate` tool timed out on every
call, the model kept trying again, and `work_alert` looped until morning: 1,900 model calls, each
resending a longer history, for one alert.

Fix `work_alert(llm, alert, *, max_steps=6)` so it makes at most `max_steps` model calls. When the
cap runs out, it returns `AgentResult(None, "step_limit", max_steps, trace)`, keeping the trace of
everything it tried so the engineer can see the tool was failing. Each `Step` records the number of
the model call that asked for it. Runs that finish, or end with a plain reply, work as before.

```python
llm = ScriptedLLM([tool_call("get_error_rate", service="checkout-api")] * 20)
result = work_alert(llm, "Alert: checkout-api 5xx rate is 7%.")
result.stop_reason, result.steps, len(llm.calls)   # ("step_limit", 6, 6)
[s.ok for s in result.trace]                       # [False, False, False, False, False, False]
```
