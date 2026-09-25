An export file has one order per line: `id,customer,total`. Define a namedtuple type `Order` with
the fields `id`, `customer` and `total`, then write two functions:

- `parse_order(line)` returns an `Order`, with `total` as a `float`. Spaces around fields are
  ignored.
- `apply_discount(order, percent)` returns a **new** `Order` with the total reduced by `percent`
  per cent, rounded to 2 decimal places.

```python
order = parse_order("A1042, ada, 20.00")
order                        # Order(id='A1042', customer='ada', total=20.0)
order.customer               # "ada"
apply_discount(order, 10)    # Order(id='A1042', customer='ada', total=18.0)
```
