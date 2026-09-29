Castlegate's hybrid search returns up to 20 candidate chunks, and the answer prompt has room for
3. Write `rerank(llm, question, candidates, top_n=3)`, which asks the model to reorder the
candidates and returns the best `top_n` chunks.

**The request.** One call to `llm.complete`, with `system=RERANK_SYSTEM` (in the starter),
`temperature=0`, and one user message:

```text
Question: What can I do if my landlord never protected my deposit?

[1] Your landlord must protect your deposit in a government-approved scheme within 30 days.

[2] Report repairs to your landlord in writing and keep a copy.

[3] If your deposit isn't protected, you can claim between one and three times its value.
```

**The reply** should be JSON like `{"ranking": [3, 1, 2]}`: candidate numbers, most relevant
first. Models don't always comply, so:

- keep only whole numbers from 1 to the number of candidates, each once, in the model's order;
- then add any candidates the model left out, in their original order;
- if the reply isn't JSON, or has no list under `"ranking"`, keep the original order.

Return the first `top_n` chunks of the final order. With one candidate or none there's nothing to
reorder: return `candidates[:top_n]` without calling the model.

```python
llm = ScriptedLLM(['{"ranking": [3, 1, 2]}'])
[c["id"] for c in rerank(llm, question, candidates, top_n=2)]    # ["deposits#1", "deposits#0"]
```
