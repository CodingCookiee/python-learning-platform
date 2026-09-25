A shop has one base price list and a set of regional adjustments. Write
`price_list(base, regional, withdrawn)` that returns the price list for one region:

- `base` and `regional` are dicts from SKU to price. Regional prices replace base prices, and a
  regional dict can add SKUs that aren't in the base list.
- `withdrawn` is a list of SKUs not sold in this region. Leave them out of the result. A withdrawn
  SKU that isn't in either dict is simply ignored.
- The SKUs come out in base order, then any regional-only SKUs in their order.
- Return a new dict. `base` and `regional` are shared by every region, so they must not change.

```python
base = {"MUG-01": 9.5, "TEE-02": 18.0, "CAP-03": 12.0}
regional = {"TEE-02": 16.5, "SCARF-04": 22.0}
price_list(base, regional, ["CAP-03"])
# {"MUG-01": 9.5, "TEE-02": 16.5, "SCARF-04": 22.0}
```
