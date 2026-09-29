`company_report(session)` returns one line per company, by name: how many applications you've
sent there and the role of the most recent one.

```python
company_report(session)
# [("Globex", 1, "Data engineer"), ("Initech", 0, None), ("Northwind", 2, "SRE")]
```

The answers are right, but with 500 companies the page takes seconds: the report sends one
query for the companies and then **one more per company**. Fix it so the report takes at most two
queries, however many companies there are, and returns exactly the same result.
