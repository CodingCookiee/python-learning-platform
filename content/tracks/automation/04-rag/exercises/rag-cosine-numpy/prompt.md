Write `cosine(a, b)`, the cosine similarity of two vectors, using numpy.

- `a` and `b` are sequences of floats of the same length: lists or numpy arrays.
- Return a plain Python `float`: 1.0 for the same direction, 0.0 at right angles, -1.0 for
  opposite directions. Length doesn't matter, only direction.
- A zero vector (an empty chunk can embed to one) is similar to nothing: return `0.0` instead of
  dividing by zero.

```python
cosine([1.0, 2.0, 0.0], [2.0, 4.0, 0.0])    # 1.0
cosine([1.0, 0.0], [0.0, 3.0])              # 0.0
```
