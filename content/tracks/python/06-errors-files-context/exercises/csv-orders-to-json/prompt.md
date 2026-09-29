A warehouse exports order lines as CSV, one row per product, and the new fulfilment API wants whole
orders as JSON. Write `orders_to_json(csv_path, json_path)` that reads the CSV, writes the orders
to `json_path`, and returns how many orders it wrote.

```text
order_id,customer,sku,quantity,unit_price
A1001,Ada Lovelace,MUG-01,2,8.50
A1002,"Hopper, Grace",TEA-12,1,4.25
A1001,Ada Lovelace,LAMP-02,1,24.00
```

```python
orders_to_json(csv_path, json_path)   # 2
```

```json
[
  {
    "order_id": "A1001",
    "customer": "Ada Lovelace",
    "lines": [
      {"sku": "MUG-01", "quantity": 2, "unit_price": "8.50"},
      {"sku": "LAMP-02", "quantity": 1, "unit_price": "24.00"}
    ],
    "total": "41.00"
  },
  {
    "order_id": "A1002",
    "customer": "Hopper, Grace",
    "lines": [{"sku": "TEA-12", "quantity": 1, "unit_price": "4.25"}],
    "total": "4.25"
  }
]
```

- Orders appear in the order their first line appears, and an order's lines may be anywhere in the
  file. Lines keep their file order within the order.
- `quantity` becomes an `int`. Money stays as text, because JSON numbers are floats: `unit_price`
  exactly as it appears in the CSV, and `total` (the sum of quantity times unit price, computed
  with `Decimal`) with two decimal places.
- Both files are UTF-8. Write the JSON with `indent=2` and accented characters kept as they are
  (the layout above is squeezed to fit; the tests compare the data, not the spacing).
