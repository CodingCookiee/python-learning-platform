A city's one-way streets only let couriers drive east or south. The planner counts how many
different shortest routes there are from the depot, at junction `(0, 0)`, to a customer at
junction `(rows, cols)`, avoiding junctions closed for roadworks. More routes means more room to
dodge traffic.

```python
count_routes(2, 2, closed=set())
# 6
count_routes(2, 2, closed={(1, 1)})
# 2
```

`count_routes` is correct, but it re-counts the same junctions an astronomical number of times: a
16 × 16 grid makes hundreds of millions of calls. Make it fast enough for a 16 × 16 grid inside
the time limit, returning exactly the same counts.

`closed` is a `set` of `(row, col)` tuples, and callers will keep passing sets. Different calls
use different closures, so an answer from one call must never leak into another.
