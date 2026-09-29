`revenue_by_region(conn)` works: it returns paid revenue per region, in cents, biggest first,
ties by region name. But it pulls every order across into Python to add them up, and the orders
table has millions of rows.

```python
revenue_by_region(conn)
# [("North", 138000), ("South", 91000), ("East", 12500)]
```

Rewrite it so the database does all the work in **one query**: filtering, grouping, summing and
sorting. No Python loop or comprehension should be left; the function returns what the query
returns.
