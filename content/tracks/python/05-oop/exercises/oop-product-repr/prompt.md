Give `Product` a `__repr__` for developers and a `__str__` for shoppers.

- `repr()` shows the call that would recreate the product.
- `str()` shows the name, the SKU in brackets, and the price with two decimals.

```python
mug = Product("MUG-01", "Coffee mug", 8.0)
repr(mug)    # "Product('MUG-01', 'Coffee mug', 8.0)"
str(mug)     # "Coffee mug (MUG-01) at 8.00"
print(mug)   # Coffee mug (MUG-01) at 8.00
[mug]        # [Product('MUG-01', 'Coffee mug', 8.0)]
```
