`find_prices(text)` should return every dollar price in a product description, as floats:

```python
find_prices("Mug $12.50, tea $3.00, postage free")   # [12.5, 3.0]
```

It returns `[]` for every description. Fix the pattern. While you're there, make sure it only
accepts real prices:

- `"$12x50"` isn't a price, so nothing is returned for it.
- A price at the end of a sentence, `"only $4.99."`, still counts.
- `"$12.505"` has too many decimal places, so it isn't a price.
