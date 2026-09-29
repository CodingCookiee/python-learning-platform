Every Monday, Northwind's customer success team gets a summary of each account. It's built by an
"agent" that is told to look up the account, its open tickets and its unpaid invoices, and it does
exactly that, every time, in that order, before writing the summary. That's four model calls, each
resending the history, for a job with fixed steps.

Refactor `weekly_summary(llm, account_id)` into a workflow:

- Call `get_account`, `get_open_tickets` and `get_unpaid_invoices` yourself, in code. An unknown
  account raises `KeyError` from `get_account`, before the model is called.
- Make **one** model call, with `system=SYSTEM` and no tools. Its single user message starts with
  the task line from the starter, followed by each of the three results as `json.dumps(result)`.
- Return the model's text, as before.

```python
llm = ScriptedLLM(["Harbour Dental: 2 open tickets (1 urgent), 1 unpaid invoice of 1,450.00. Call them this week."])
weekly_summary(llm, "A-17")   # the summary above
len(llm.calls)                # 1 (it was 4)
```
