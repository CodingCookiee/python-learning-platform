Both functions below work, but one reaches the next item by index and the other nests two loops.
Rewrite `gaps` with `itertools.pairwise` and `variants` with `itertools.product`, leaving no calls
to `range()`.

```python
gaps([0, 30, 45, 400])                 # [30, 15, 355]
variants(["S", "M"], ["red", "blue"])  # ["S-red", "S-blue", "M-red", "M-blue"]
```

The results must stay exactly the same, in the same order.
