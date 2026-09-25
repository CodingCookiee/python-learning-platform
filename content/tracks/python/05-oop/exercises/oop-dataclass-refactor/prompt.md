`Supplier` spends most of its lines on an `__init__`, a `__repr__` and an `__eq__` that a
dataclass would generate for you. Rewrite it as a `@dataclass` that behaves exactly the same,
keeping the `ships_within` method.

```python
acme = Supplier("Acme Tools", "DE")
acme                   # Supplier(name='Acme Tools', country='DE', lead_time_days=14)
acme == Supplier("Acme Tools", "DE")   # True
acme.ships_within(10)  # False
```
