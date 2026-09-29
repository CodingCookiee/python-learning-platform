These stock helpers work, but `mypy --strict` can't tell what their empty containers will hold:

```text
solution.py:3: error: Need type annotation for "stock" (hint: "stock: dict[<type>, <type>] = ...")  [var-annotated]
solution.py:11: error: Need type annotation for "by_supplier" (hint: "by_supplier: dict[<type>, <type>] = ...")  [var-annotated]
solution.py:19: error: Need type annotation for "to_order" (hint: "to_order: list[<type>] = ...")  [var-annotated]
```

Annotate the three variables so that `mypy --strict` passes. Don't change what the functions do.

```python
stock_by_sku([("MUG-01", 10), ("MUG-01", -3)])            # {"MUG-01": 7}
skus_by_supplier([("MUG-01", "Stoneware Co"), ("MUG-02", "Stoneware Co")])
# {"Stoneware Co": ["MUG-01", "MUG-02"]}
reorder_list({"MUG-01": 2, "BEANS-1KG": 40}, threshold=5)  # ["MUG-01"]
```
