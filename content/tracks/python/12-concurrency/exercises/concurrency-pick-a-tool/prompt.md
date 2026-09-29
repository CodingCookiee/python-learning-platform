The platform team runs a dozen batch jobs, and wants a rule of thumb written down as code. Each job
is described by a `Job` (already written in the starter):

- `tasks`: how many independent pieces of work it has
- `bound`: `"io"` or `"cpu"`
- `async_client`: whether the library it uses has an async API
- `free_threaded`: whether it runs on a free-threaded build (`python3.14t`)

Write `pick_tool(job)` that returns `"sequential"`, `"asyncio"`, `"threads"` or `"processes"`,
following the lesson's table:

- A job with a single task gains nothing from concurrency: `"sequential"`.
- I/O-bound work uses `"asyncio"` when there's an async client, and `"threads"` when the library
  only blocks.
- CPU-bound work uses `"threads"` on a free-threaded build, and `"processes"` otherwise.

```python
pick_tool(Job(tasks=5_000, bound="io", async_client=True, free_threaded=False))    # "asyncio"
pick_tool(Job(tasks=40, bound="cpu", async_client=False, free_threaded=False))     # "processes"
```
