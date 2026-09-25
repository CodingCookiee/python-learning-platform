The delivery team wants to know how many parcels go to each address. Model addresses as immutable
values.

- `Address(street, city, postcode, country="GB")` is a frozen dataclass: assigning a field after
  creation raises `dataclasses.FrozenInstanceError`. Equal addresses are equal and hash alike.
- `with_postcode(postcode)` returns a copy with a new postcode, leaving the original unchanged.
- `label()` returns the address as three lines: street, then city and postcode, then country.
- `deliveries_per_address(addresses)` takes a list of addresses (with repeats) and returns a dict
  (a `Counter` is fine) mapping each address to how many times it appears.

```python
home = Address("1 Mill Lane", "Leeds", "LS1 4AB")
print(home.label())
# 1 Mill Lane
# Leeds LS1 4AB
# GB

counts = deliveries_per_address([home, Address("1 Mill Lane", "Leeds", "LS1 4AB"), home.with_postcode("LS2 9JT")])
counts[home]      # 2
home.city = "York"   # FrozenInstanceError
```
