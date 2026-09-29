Put every guardrail from the lesson into one agent loop for the on-call helper:

```python
run_guarded(llm, task, tools, registry, *, limits, clock, system=None, max_tokens=500) -> GuardedResult
```

`limits` is a `Limits` (in the starter) with `max_steps`, `max_cost`, `max_seconds`,
`max_repeats` and `price`. `clock()` returns the current time in seconds. It's the loop from
lesson 2 (offer `[*tools, FINISH]`, errors as observations with `run_tool`), with these checks,
**before** each model call, in this order:

1. **Deadline.** If `clock()` minus the time at the start of the run is at least
   `max_seconds`, stop with `"timeout"`.
2. **Budget.** If the cost so far plus `worst_case_cost(messages, system, tools_offered,
   max_tokens, price)` would be more than `max_cost`, stop with `"budget"`.

After each call, add its actual cost, `call_cost(response.usage, price)`. And before running each
tool call:

3. **Loops.** Count calls by tool name and arguments (in any order). When this call's count
   reaches `max_repeats`, stop with `"loop"` without running it.

The other stops are as before: `"finished"` (the answer from `finish`), `"no_finish"` (the reply's
text) and `"step_limit"`. Return `GuardedResult(answer, stop_reason, steps, cost)`, where `steps`
is the model calls made and `cost` the total actual cost, a `Decimal`.

```python
clock = FakeClock()       # each scripted reply moves it on 25 seconds
result = run_guarded(llm, "Alert: checkout-api 5xx rate is 7%.", TOOLS, REGISTRY, limits=Limits(max_seconds=60), clock=clock)
result.stop_reason, result.steps   # ("timeout", 3): the fourth call would start 75 seconds in
```
