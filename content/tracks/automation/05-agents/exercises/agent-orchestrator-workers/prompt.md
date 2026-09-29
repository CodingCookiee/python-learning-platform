Before each renewal, Northwind's account managers want a review of the account. What it covers
depends on the account, so a model decides the parts. Write:

```python
async def review_account(llm, task, *, max_workers=4) -> Report
```

`llm` is async (`await llm.complete(...)`). Every call is a single user message; the prompt
helpers and system prompts are in the starter.

1. **Orchestrate.** One call with `orchestrator_prompt(task)` and `system=ORCHESTRATOR_SYSTEM`. The
   reply is a JSON list of subtasks, each `{"title": ..., "instructions": ...}`. If it isn't valid
   JSON, isn't a list of 1 to `max_workers` subtasks, or a subtask lacks a string `title` or
   `instructions`, raise `ValueError` before any worker runs.
2. **Work.** One call per subtask with `worker_prompt(task, subtask)` and `system=WORKER_SYSTEM`,
   all running concurrently. Each reply's text is that subtask's finding, in subtask order.
3. **Synthesise.** One call with `synthesis_prompt(task, subtasks, findings)` and
   `system=SYNTHESISER_SYSTEM`.

Return `Report(subtasks, findings, answer)`.

```python
report = await review_account(llm, "Renewal review for Harbour Dental (C-301)")
[s["title"] for s in report.subtasks]   # ["Support history", "Billing", "Product usage"]
len(llm.calls)                          # 5: orchestrator, three workers, synthesiser
```
