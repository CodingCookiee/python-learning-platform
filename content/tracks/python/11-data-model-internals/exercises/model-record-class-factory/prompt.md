A CSV importer reads a header row and needs a small class for each file's rows, but it only learns
the column names at run time. Write `make_record(name, fields)` that builds that class with
`type()`, without a `class` statement:

- The class is called `name`, and its class attribute `fields` is the tuple of field names.
- Instances are created with each field given positionally or by keyword, like a normal class.
  A missing field, an unknown one or a field given twice raises `TypeError`.
- `repr()` looks like the call that made it, and two records are equal when they're the same
  record class with the same values.

```python
StockLine = make_record("StockLine", ["sku", "quantity"])

line = StockLine("MUG-01", quantity=12)
line.quantity        # 12
line                 # StockLine(sku='MUG-01', quantity=12)
StockLine.fields     # ('sku', 'quantity')
line == StockLine("MUG-01", 12)    # True
StockLine("MUG-01")                # TypeError
```
