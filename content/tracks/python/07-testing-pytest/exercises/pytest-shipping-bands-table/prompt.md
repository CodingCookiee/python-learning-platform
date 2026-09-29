The warehouse's shipping rules, in code:

```python
# shipping.py
def shipping_band(weight_kg):
    """The shipping band for a parcel: "small" up to and including 2 kg,
    "medium" up to and including 10 kg, and "large" above that."""
    if weight_kg <= 2:
        return "small"
    if weight_kg <= 10:
        return "medium"
    return "large"
```

```python
shipping_band(0.5)   # "small"
shipping_band(2)     # "small"
shipping_band(12)    # "large"
```

The starter has one parametrized test with a single case. Fill in its table in `test_shipping.py`
with at least five cases that pin down both boundaries. Your test must pass on this code and catch
the bugs planted in copies of it.
