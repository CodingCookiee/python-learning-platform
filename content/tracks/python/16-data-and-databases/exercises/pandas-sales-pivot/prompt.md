Write `monthly_revenue(orders, products)`, which returns a pivot table of revenue with one row per
product category and one column per month.

- `orders` has `order_id`, `sku`, `placed_on` (datetimes), `quantity` and `unit_price`. An order
  line's revenue is `quantity * unit_price`.
- `products` has `sku`, `name` and `category`.
- Columns are months as text, like `"2026-09"`, in order; rows are categories, in alphabetical
  order; a category with no sales in a month shows `0`. Values are rounded to 2 decimal places.
- An order for a SKU that isn't in `products` raises `ValueError` naming the SKU (a missing
  product would otherwise vanish from the report), and so does a SKU listed twice in `products`.

```python
monthly_revenue(orders, products).to_dict()
# {"2026-08": {"Furniture": 300.0, "Lighting": 0.0},
#  "2026-09": {"Furniture": 390.0, "Lighting": 49.5}}
```
