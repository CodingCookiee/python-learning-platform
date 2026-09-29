The webhook server acknowledges each webhook straight away and processes it in the background, so
fire-and-forget tasks are exactly what it needs. It also needs the three problems from the lesson
solved: tasks garbage collected halfway through, errors nobody sees, and shutting down with work
still running. Write a class `BackgroundTasks`:

- `spawn(coro)` starts the coroutine as a task and returns the task. The object keeps a strong
  reference to every task until that task has finished, so a caller can safely ignore the return
  value.
- `pending` (a property) is the number of spawned tasks that haven't finished.
- `errors` is a list of the exceptions raised by tasks that failed, in the order they failed. A
  failure never propagates anywhere else, and a cancelled task isn't a failure.
- `await drain()` waits until every task has finished, including tasks spawned while it was
  waiting, and never raises because of a failed task.

```python
background = BackgroundTasks()

async def receive(webhook):
    background.spawn(process(webhook))     # the return value can be thrown away
    return 202

...
await background.drain()                   # at shutdown
background.errors                          # [ValueError("wh_19: unknown event type")]
```
