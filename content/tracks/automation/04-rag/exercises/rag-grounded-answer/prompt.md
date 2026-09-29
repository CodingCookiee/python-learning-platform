Put the whole answer step together for Castlegate's FAQ bot. Write
`answer_question(question, search, llm, k=4, min_score=0.3)`, which returns an `Answer` (the
dataclass in the starter): the text to show, the ids of the chunks it cites, and whether it
refused.

- `search(question, k)` returns up to `k` pairs `(chunk, score)`, best first. Call it once, with
  the `k` you were given.
- **Refuse before the call:** if there are no results, or the best score is below `min_score`,
  return `Answer(REFUSAL, [], True)` without calling the model.
- Otherwise build the prompt with the starter's `build_prompt` from the retrieved chunks, in
  order, and make one call: `llm.complete(messages, system=system, temperature=0)`.
- Citations `[n]` (or `[n, m]`) in the reply refer to the numbered sources. Turn them into chunk
  ids, each once, in the order first cited, ignoring numbers that don't match a source.
- **Refuse after the call:** if the reply contains `REFUSAL`, or no valid citation is left, return
  `Answer(REFUSAL, [], True)`. An uncited answer isn't grounded.
- Otherwise return `Answer(text, citations, False)`, with the reply's text stripped of surrounding
  whitespace.

```python
llm = ScriptedLLM(["Your landlord must protect it within 30 days [1]."])
answer_question("How long does my landlord have to protect my deposit?", search, llm)
# Answer(text="Your landlord must protect it within 30 days [1].", citations=["deposits#0"], refused=False)
```
