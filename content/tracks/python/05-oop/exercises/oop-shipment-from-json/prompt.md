The warehouse system sends shipments as JSON. Write a `Shipment` class that reads and writes that
format and refuses bad data.

- `Shipment(tracking, weight_g, shipped)`: `weight_g` is a whole number of grams and `shipped` is a
  `datetime.date`. Raise `ValueError` if the tracking code isn't valid or the weight isn't positive.
- `Shipment.valid_tracking(code)` (a static method) returns `True` for a code of two uppercase
  letters, nine digits and two uppercase letters, like `"RA123456785GB"`.
- `Shipment.from_json(text)` builds a shipment from JSON with the keys `tracking`, `weight_g` and
  `shipped` (an ISO date such as `"2026-09-20"`). Called on a subclass, it returns that subclass.
- `to_json()` returns JSON with the same three keys, so `from_json(s.to_json())` gives an equal
  shipment back.
- `weight_kg` is a read-only property: the weight in kilograms.
- `days_in_transit(today)` returns how many days have passed since `shipped`.

```python
text = '{"tracking": "RA123456785GB", "weight_g": 2500, "shipped": "2026-09-20"}'
parcel = Shipment.from_json(text)
parcel.shipped                         # datetime.date(2026, 9, 20)
parcel.weight_kg                       # 2.5
parcel.days_in_transit(date(2026, 9, 25))   # 5
Shipment.valid_tracking("RA12345GB")  # False
```
