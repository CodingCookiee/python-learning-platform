The **volume-weighted average price** (VWAP) of a day's trades is the average price with each trade
weighted by how many shares changed hands: the total value traded divided by the total volume.
Trading desks compare their fills against it.

Write `vwap(prices, volumes)`. Both are numpy arrays of the same length, one entry per trade.
Return the VWAP as a `float`.

```python
vwap(np.array([101.2, 101.5, 101.1]), np.array([300, 100, 600]))
# 101.17   (that's 101 170 traded over 1 000 shares)
```

A busy stock trades a million times a day, and one test uses exactly that many, so don't loop over
the trades in Python.
