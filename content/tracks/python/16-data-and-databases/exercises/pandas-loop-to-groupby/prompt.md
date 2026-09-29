`won_by_rep(sales)` takes the CRM's deals as a DataFrame (`rep`, `stage`, `value`) and returns one
row per sales rep: how many deals they've won and their total won value, biggest total first, ties
by rep. It works, but it visits every row in a Python loop, and the full CRM export has hundreds
of thousands of deals.

```python
won_by_rep(sales)
#      rep  deals    value
# 0  Priya      2  17500.0
# 1    Tom      1   9000.0
```

Rewrite it with pandas operations on whole columns: a filter, a `groupby` with named aggregation,
and a sort. No Python loop, `itertuples`, `iterrows` or `apply` should be left.
