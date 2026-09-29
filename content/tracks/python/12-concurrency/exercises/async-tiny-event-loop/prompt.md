Build the heart of asyncio yourself. An awaitable called `Sleep` is written for you: awaiting
`Sleep(ticks)` pauses a coroutine by yielding the number of ticks it wants to sleep. Write
`run(coros)`, an event loop that runs a list of coroutine objects concurrently on a **virtual
clock** that starts at 0, and returns `(finished_at, result)` for each one, in the order they
finish.

- When a coroutine yields `ticks`, it sleeps until the clock reaches now + ticks, while the loop
  runs the others. `Sleep(0)` just lets the others have a turn.
- The loop jumps the clock straight to the next wake-up time; it never counts through ticks one
  by one.
- Coroutines that wake at the same tick resume in the order they went to sleep. At the start,
  they run in the order they're listed.
- If a coroutine raises, `run` lets the exception propagate.

```python
async def download(name, *chunk_ticks):
    for ticks in chunk_ticks:
        await Sleep(ticks)
    return name

run([download("invoice.pdf", 3, 3), download("logo.png", 1), download("report.csv", 2, 2, 2)])
# [(1, "logo.png"), (6, "invoice.pdf"), (6, "report.csv")]
```

`invoice.pdf` and `report.csv` both finish at tick 6, but `invoice.pdf` went to sleep for the last
time at tick 3 and `report.csv` at tick 4, so `invoice.pdf` comes first.
