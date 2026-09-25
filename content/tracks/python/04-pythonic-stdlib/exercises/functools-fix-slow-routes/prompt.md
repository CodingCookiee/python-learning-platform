A warehouse picking robot starts in one corner of a grid of aisles and moves only down or right.
`routes(rows, cols, blocked)` counts the different routes to the cell `(rows, cols)`, avoiding
any cells in the set `blocked`:

```python
routes(2, 2)            # 6
routes(2, 2, {(1, 1)})  # 2
```

It gives the right answers, but on a real 30 × 30 floor it runs for hours. Make it fast by caching
with `functools.cache`, without changing how it counts. The floor planner passes `blocked` as a
`set`, and that must keep working.
