A logistics company's operations manager lists what she'd like automated, and you've estimated how
many days each would take to build. Sort the list into the four boxes of a value/effort matrix.

Write `plan_backlog(opportunities, *, hourly_rate, value_bar, effort_bar)`. Each opportunity is a
dict (numbers are ints or `Decimal`s):

| Key | Meaning |
|-----|---------|
| `name` | what it's called |
| `runs_per_month`, `minutes_per_run` | how often, and how long a person takes |
| `error_rate`, `cost_per_error` | optional, default `0`: how often people get it wrong, and what that costs |
| `strategic` | optional, default `"medium"`: `"low"`, `"medium"` or `"high"` |
| `build_days` | your estimate |

Its **priority** is its monthly value (hours saved × `hourly_rate`, plus runs × error rate × cost
per error) multiplied by a strategic weight: 1 for low, 2 for medium, 3 for high. An opportunity is
high value when its priority is at least `value_bar`, and low effort when `build_days` is at most
`effort_bar`.

Return a dict with these four keys, in this order, each holding a list of names, highest priority
first (ties in name order):

- `"quick wins"`: high value, low effort
- `"big bets"`: high value, high effort
- `"fill-ins"`: low value, low effort
- `"money pits"`: low value, high effort

```python
plan_backlog([exceptions, timesheets, routes, customs],
             hourly_rate=Decimal("25"), value_bar=2000, effort_bar=10)
# {"quick wins": ["Delivery exception emails"], "big bets": ["Route planning"],
#  "fill-ins": ["Driver timesheets"], "money pits": ["Customs paperwork"]}
```

The data for that example is at the top of the tests. All the numbers are examples.
