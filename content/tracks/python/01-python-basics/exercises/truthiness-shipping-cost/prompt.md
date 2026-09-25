Write `shipping_cost(weight_kg)` that returns the price of posting a parcel, from this table:

| Weight | Cost |
|--------|------|
| more than 0, up to and including 1 kg | 3.50 |
| more than 1, up to and including 5 kg | 7.00 |
| more than 5, up to and including 20 kg | 15.00 |
| anything else (0 or less, or over 20 kg) | can't be shipped: return `None` |

```python
shipping_cost(0.5)    # 3.5
shipping_cost(5)      # 7.0
shipping_cost(25)     # None
```
