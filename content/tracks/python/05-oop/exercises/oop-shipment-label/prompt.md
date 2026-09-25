Write a `Shipment` class for a parcel carrier.

- `Shipment(tracking, weight_kg)` stores both values as the attributes `tracking` and `weight_kg`.
- `label()` returns the text printed on the parcel: the tracking code, then the weight in brackets.

```python
parcel = Shipment("RA123456785GB", 2.5)
parcel.tracking   # "RA123456785GB"
parcel.weight_kg  # 2.5
parcel.label()    # "RA123456785GB (2.5 kg)"
```
