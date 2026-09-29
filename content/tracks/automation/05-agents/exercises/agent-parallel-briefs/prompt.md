Before Monday's calls, Northwind's sales team wants a short brief for every account on the list.
Doing them one after another takes a minute; they're independent, so do them at once:

```python
async def brief_accounts(llm, companies, *, limit=3) -> list[str | None]
```

`llm` is the async twin of your client: `await llm.complete(...)` takes the same arguments.

- One call per company, with `system=BRIEF_SYSTEM` and a single user message
  `Write a two-line pre-call brief for <company>.`
- Run them concurrently, with at most `limit` calls in flight at once (an `asyncio.Semaphore`).
- Return the briefs (each reply's text) in the same order as `companies`, whatever order they
  finish in.
- If a company's call raises, its brief is `None`, and the others still come back.

```python
await brief_accounts(llm, ["Harbour Dental", "Kiln & Co", "Brightline"])
# ["Harbour Dental: ...", "Kiln & Co: ...", "Brightline: ..."]
```
