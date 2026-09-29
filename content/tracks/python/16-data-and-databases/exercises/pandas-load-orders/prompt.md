Write `load_orders(csv_text)`, which reads the shop's order export (the CSV as a string) into a
DataFrame with the right types:

- `sku` stays text: SKUs like `00417` must keep their leading zeros.
- `placed_on` is a real datetime column, not text.
- `order_id` and `quantity` are integers, and `unit_price` is a float, as pandas reads them anyway.

```python
csv_text = """order_id,sku,placed_on,quantity,unit_price
1001,00417,2026-09-01,2,12.50
1002,00990,2026-09-02,1,75.00
"""
orders = load_orders(csv_text)
orders["sku"].tolist()                 # ["00417", "00990"]
orders["placed_on"].dt.day.tolist()    # [1, 2]
```
