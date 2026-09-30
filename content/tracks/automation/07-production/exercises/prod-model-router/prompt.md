The support bot's eval showed the small model answers 80% of questions as well as the large one,
at a twentieth of the cost (example prices). Route every question to the cheapest model that's sure
of its answer.

First write `parse_reply(text)`: the router's replies should be JSON like
`{"answer": "...", "confidence": 0.93}`. Return `(answer, confidence)` as a string and a float when
the answer is a non-empty string and the confidence a number (not a boolean) from 0 to 1. Return
`None` for anything else, including text that isn't JSON.

Then write `route(llm, question, *, threshold=0.7, models=("model-small", "model-large"))`, which
returns a `Routed(answer, model, escalated, needs_review)` (in the starter):

- Try the models in order, each with
  `llm.complete([{"role": "user", "content": question}], system=ROUTER_SYSTEM, model=model, temperature=0)`.
- The first usable reply with a confidence of at least `threshold` wins, with `needs_review=False`.
  `escalated` is `True` when it didn't come from the first model.
- An unusable reply, or an unsure one, moves on to the next model. Stop at the first confident
  answer: never call a bigger model you don't need.
- If no model is confident, return the **last** usable answer with `needs_review=True`, so a person
  checks it. If no reply was usable at all, raise `RoutingFailed`.

```python
llm = ScriptedLLM(['{"answer": "Refunds take 14 days.", "confidence": 0.93}'])
route(llm, "How long do refunds take?")
# Routed(answer='Refunds take 14 days.', model='model-small', escalated=False, needs_review=False)
```
