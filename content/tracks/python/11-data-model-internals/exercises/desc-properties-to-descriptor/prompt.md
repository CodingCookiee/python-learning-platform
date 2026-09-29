`Shipment` validates three fields with three properties that differ only in their names. A fourth
field is coming, and nobody wants to paste the block again. Replace the properties with a single
descriptor class, `PositiveNumber`, that learns each field's name with `__set_name__`.

Nothing a caller can see may change:

- Each field accepts an `int` or `float` above zero, when the shipment is created and afterwards.
- Anything else (zero, a negative, a `bool`, a string) raises `ValueError` with the same message as
  now, for example `weight_kg must be a positive number, got -1`, and the old value is kept.
- `Shipment.weight_kg` (read on the class) gives the `PositiveNumber` descriptor.

```python
parcel = Shipment("SHP-1", weight_kg=2.5, length_cm=40, declared_value=120)
parcel.weight_kg = 3
parcel.weight_kg       # 3
parcel.length_cm = 0   # ValueError: length_cm must be a positive number, got 0
```

No `property` may be left in the file.
