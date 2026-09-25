`leaderboard(names, scores)` builds the lines for a quiz leaderboard. `names` and `scores` are
parallel lists, already sorted best first:

```python
leaderboard(["Ada", "Grace", "Linus"], [91, 88, 72])
# ["1. Ada - 91 points", "2. Grace - 88 points", "3. Linus - 72 points"]
```

It works, but it's written like C: a `range(len(...))` loop and index arithmetic. Rewrite it with
`zip` and `enumerate` so there is no `range`, no `len` and no `names[i]`. The output must stay the
same.
