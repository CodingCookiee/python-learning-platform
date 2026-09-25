`with_task(tasks, task)` is supposed to return a **new** list with `task` added at the end,
leaving the original alone. But after calling it, the caller's list has changed too:

```python
monday = ["write report"]
updated = with_task(monday, "call bank")
monday     # ["write report", "call bank"]  ← should still be ["write report"]
```

Fix it so the original list is never modified.
