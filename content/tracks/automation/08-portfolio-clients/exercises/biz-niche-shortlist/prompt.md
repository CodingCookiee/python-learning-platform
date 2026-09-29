After a few months of discovery calls, you notice you keep hearing about the same problem. A niche
is exactly that: one process that hurts in the same way at many businesses of one kind. It's the
start of a productised offer, because you can build it once and sell it again.

Write `niche_shortlist(records, *, min_clients=3)`. Each record is one opportunity you noted:

```python
{"client": "Brightsmile Dental", "industry": "Dental", "process": "Recall reminders",
 "monthly_value": Decimal("640")}
```

Group the records by industry and process, compared case-insensitively and ignoring surrounding
spaces (use the stripped, lower-cased names in the result). A client listed more than once for the
same process counts once, with its highest value; clients are compared the same way. Keep the
groups with at least `min_clients` different clients, and return one dict for each:

```python
{"industry": "dental", "process": "recall reminders", "clients": 3, "median_value": Decimal("640")}
```

`median_value` is the median of the clients' values. Sort the most common first, then by median
value (highest first), then by industry and process name.

```python
niche_shortlist(NOTES)   # NOTES is at the top of the tests
# [{"industry": "ecommerce", "process": "order status emails", "clients": 3, "median_value": Decimal("900")},
#  {"industry": "dental", "process": "recall reminders", "clients": 3, "median_value": Decimal("640")}]
```
