`total_by_status(path)` reads a shop's order export and totals the amounts per status. It worked
on the file straight from the shop. Then the client opened the export in Excel, tidied it, and
saved it as CSV again:

```text
status,order_id,amount
paid,1001,19.99
refunded,1002,0.10
refunded,1003,0.20
paid,1004,5.01
,,
,,
```

```python
total_by_status(path)
# KeyError: 'status'
```

Fix it so that it:

- reads files saved by Excel (which start with a byte order mark) and files without one;
- returns the totals as `Decimal`s, exact to the penny:
  `{"paid": Decimal("25.00"), "refunded": Decimal("0.30")}`;
- ignores the empty rows Excel leaves at the end.
