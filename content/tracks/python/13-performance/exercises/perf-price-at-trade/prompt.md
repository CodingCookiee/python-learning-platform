A trade report needs, for every trade, the price that was in effect when it happened: the price
from the latest change **at or before** the trade's time. Write
`prices_at(trade_times, change_times, change_prices)`.

- `change_times` is sorted from earliest to latest (seconds since the market opened), and
  `change_prices[i]` is the price set at `change_times[i]`. If two changes share a time, the later
  one in the list is the one in effect.
- `trade_times` are in no particular order. Return one price per trade, in the same order, or
  `None` for a trade before the first change.

```python
change_times = [0, 30, 45, 90]
change_prices = [101.5, 101.8, 101.6, 102.0]
prices_at([10, 30, 60, 200, -5], change_times, change_prices)
# [101.5, 101.8, 101.6, 102.0, None]
```

A full trading day has 50 000 price changes and 10 000 trades, and one of the tests uses exactly
that.
