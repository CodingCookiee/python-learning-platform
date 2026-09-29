Every search ends the same way: a score per chunk, and you need the positions of the best few.
Write `top_k(scores, k)`.

- `scores` is a list or numpy array of floats. Return the indices of the `k` highest scores as a
  list of plain `int`s, highest score first.
- Equal scores keep their original order (the lower index first).
- If `k` is larger than the number of scores, return them all; if `k` is 0 or negative, return `[]`.

```python
top_k([0.12, 0.81, 0.45, 0.81, 0.07, 0.66], 3)    # [1, 3, 5]
```
