Write a plan-then-execute agent for Northwind's account managers:

```python
plan_and_execute(llm, goal, tools, registry, *, max_plan_steps=5) -> PlanRun
```

1. **Plan.** One call with a single user message, `planner_prompt(goal, tools)` (in the starter),
   and **no tools**. Parse the reply with `parse_plan`. If the plan is empty or has more than
   `max_plan_steps` steps, raise `PlanError` before running anything else.
2. **Execute.** For each step, in order (counting from 1), make one call with a single user message
   `step_prompt(goal, plan, number, results)` and `tools=tools`. Run every tool call in the
   response from `registry`. The step's result is `json.dumps` of the list of their outputs (a
   tool that raises contributes `{"error": str(error)}`), or the response's text if it called no
   tools. Append it to `results`.
3. **Answer.** One last call with a single user message `answer_prompt(goal, plan, results)` and no
   tools. Its text is the answer.

Return `PlanRun(plan, results, answer)`.

```python
llm = ScriptedLLM([
    "1. Look up the account\n2. List open tickets\n3. Write the brief",
    tool_call("get_account", account_id="C-301"),
    tool_call("get_open_tickets", account_id="C-301"),
    "Ready to write.",
    "Harbour Dental renews on 2 October. Fix T-881 (export fails) before the call.",
])
run = plan_and_execute(llm, "Prepare the renewal call with Harbour Dental (C-301)", TOOLS, REGISTRY)
run.plan      # ["Look up the account", "List open tickets", "Write the brief"]
len(llm.calls)  # 5: one plan, three steps, one answer
```
