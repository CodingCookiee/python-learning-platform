A customer's script asked the support bot the same question every two seconds all weekend. Finish
`CachedLLM(llm, *, ttl=3600.0, clock=time.time)`, a wrapper with the usual `complete()` that answers
repeated requests from a cache, using `cache_key` from the starter.

- **Only deterministic calls are cached**: `temperature == 0`. Any other call (including one that
  doesn't set a temperature) goes straight to the wrapped llm and adds 1 to `bypassed`.
- For a deterministic call, the key covers the model **actually used** (the `model` argument, or the
  wrapped llm's `.model`), and all the other arguments.
- A stored response younger than `ttl` seconds (by `clock()`) is returned as it is, without calling
  the llm, and adds 1 to `hits`. Otherwise it's a miss: add 1 to `misses`, call the llm, and
  return its response.
- Store a response (with the time) only if it's a complete answer: `stop_reason == "end_turn"` and
  no tool calls. A truncated reply or a request to run a tool must never be replayed.

```python
fake = ScriptedLLM(["Refunds reach your card within 14 days."])
llm = CachedLLM(fake, clock=lambda: 0.0)
question = [{"role": "user", "content": "How long do refunds take?"}]
llm.complete(question, temperature=0)
llm.complete(question, temperature=0).text   # "Refunds reach your card within 14 days."
(llm.hits, llm.misses, len(fake.calls))      # (1, 1, 1)
```
