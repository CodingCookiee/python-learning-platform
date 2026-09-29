A shop exports its orders as a UTF-8 CSV file with a header row. Write `totals_by_customer(path)`
that returns how much each customer has **paid**: a dict mapping each customer to the sum of the
totals of their orders whose status is `paid`, as a `Decimal`, in the order the customers first
appear with a paid order.

```text
order_id,customer,total,status
A1001,Ada Lovelace,12.50,paid
A1002,"Hopper, Grace",8.00,paid
A1003,Ada Lovelace,30.00,refunded
A1004,Ada Lovelace,4.25,paid
```

```python
totals_by_customer(path)
# {"Ada Lovelace": Decimal("16.75"), "Hopper, Grace": Decimal("8.00")}
```

Customer names can contain commas and accented letters. Use the `csv` module rather than
splitting lines yourself.
