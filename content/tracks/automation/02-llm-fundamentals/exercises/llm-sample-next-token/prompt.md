Write the step a model runs for every token it generates: turn scores into probabilities, then pick
one.

`token_probabilities(logits, temperature)` takes a dict of token → logit and returns a dict of
token → probability (same keys, same order), using softmax on the logits divided by `temperature`.
The probabilities add up to 1. Make it safe for large logits: `math.exp(1000)` overflows.

`sample_next_token(logits, *, temperature, top_p=1.0, rng)` returns one token:

- At `temperature` 0 it's greedy: the token with the highest logit (the first one on a tie). Don't
  call `token_probabilities`, which would divide by zero.
- Otherwise, compute the probabilities, keep the **smallest** set of most-likely tokens whose
  probabilities add up to at least `top_p`, and pick one of those at random with `rng` (a
  `random.Random`), in proportion to its probability.
- Raise `ValueError` for a negative temperature, or a `top_p` that isn't more than 0 and at most 1.

```python
logits = {"shipped": 2.0, "delayed": 1.0, "lost": 0.0}
token_probabilities(logits, 1.0)
# {"shipped": 0.665, "delayed": 0.245, "lost": 0.090}  (to 3 places)

sample_next_token(logits, temperature=0, rng=random.Random(1))              # "shipped"
sample_next_token(logits, temperature=1.0, top_p=0.5, rng=random.Random(1)) # "shipped": the only candidate
```
