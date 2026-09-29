Brightline's invoice agent has a budget of a few cents per run, and the finance report says runs
regularly go over it. The loop checks the budget only after each model call, when the money has
already been spent.

Fix `run_agent` so spending can **never** pass `budget.limit`:

- Before every call, work out the call's worst case with `budget.worst_case(...)` (in the
  starter: the estimated input plus `max_tokens` of output). If what's been spent plus the worst
  case would be more than the limit, stop with `AgentResult(None, "budget", steps)` **without
  making the call**. Exactly reaching the limit is allowed.
- After every call, charge its actual cost with `budget.charge(response)`, as now.
- `steps` is always the number of model calls made.

```python
budget = Budget(Decimal("0.0205"))              # each call really costs $0.006; the worst case is about $0.008
result = run_agent(llm, TASK, TOOLS, REGISTRY, budget=budget)
result.stop_reason, result.steps, budget.spent  # ("budget", 3, Decimal("0.018")); it used to be 4 calls and $0.024
```
