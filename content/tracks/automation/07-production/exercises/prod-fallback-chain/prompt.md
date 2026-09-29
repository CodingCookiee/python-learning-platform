Write `answer(question, chain, cache)` for the support bot, so a provider outage doesn't take it
down.

- `chain` is a list of `(name, llm)` pairs, tried in order. Each call is
  `llm.complete([{"role": "user", "content": question}], system=SUPPORT_SYSTEM, temperature=0)`.
- The first success returns `Answer(text, source=name, stale=False)` (in the starter), and stores
  the text in `cache` (a dict) under `cache_key(question)`.
- An error that `is_retryable` (in the starter) moves on to the next option. Any other error is
  raised at once: a bad request is bad for every model.
- When every option failed, return the cached answer for the question if there is one, as
  `Answer(text, source="cache", stale=True)`. Otherwise raise `AllProvidersDown` (in the starter)
  with `.errors`, a list of `(name, error)` pairs in the order they were tried.

Also write `cache_key(question)`: the question with runs of whitespace collapsed to one space, the
ends stripped, and the case folded, so `"How long do refunds take? "` and
`"how long do  refunds take?"` share an answer.

```python
chain = [("primary", ScriptedLLM([Fail(529)])), ("secondary", ScriptedLLM(["Refunds take 14 days."]))]
cache = {}
answer("How long do refunds take?", chain, cache)
# Answer(text='Refunds take 14 days.', source='secondary', stale=False)
cache
# {'how long do refunds take?': 'Refunds take 14 days.'}
```
