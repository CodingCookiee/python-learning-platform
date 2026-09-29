The risk desk flags every tick where a price jumped by at least `threshold` (a fraction, so `0.01`
is 1%) since the tick before. `big_moves` does it with a Python loop over a numpy array, which
fell over the first time it met a full day of 300 000 ticks.

```python
prices = np.array([100.0, 101.0, 100.9, 98.0, 98.1])
big_moves(prices, 0.01).tolist()
# [1, 3]     (up 1% at tick 1, down 2.9% at tick 3)
```

Vectorise `big_moves` so a full day of ticks runs inside the time limit. It must return the same
indices, as a numpy array of integers, and work out each change the same way:
`(price - previous) / previous`.
