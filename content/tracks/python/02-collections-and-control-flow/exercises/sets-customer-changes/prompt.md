You have two lists of customer IDs: everyone who ordered last month and everyone who ordered this
month. A customer can appear more than once in a list (one entry per order). Write
`customer_changes(last_month, this_month)` that returns a tuple of three **sets**:

1. **returning**: customers who ordered in both months,
2. **new**: customers who ordered this month but not last month,
3. **lapsed**: customers who ordered last month but not this month.

```python
last_month = ["ada", "grace", "linus", "grace"]
this_month = ["grace", "ken", "linus", "ken", "barbara"]
customer_changes(last_month, this_month)
# ({"grace", "linus"}, {"ken", "barbara"}, {"ada"})
```
