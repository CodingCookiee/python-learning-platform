A CRM needs an audit trail: every edit to a customer record should be recorded, without anyone
having to remember to call a `log_change()` method. Write a base class `TrackedRecord`. Subclasses
set their fields in `__init__` as usual (they don't call `super().__init__()`), and then:

- Assigning a new value to an existing public attribute records `(name, old, new)`.
- Deleting a public attribute records `(name, old, None)`.
- These aren't changes and aren't recorded: the first assignment of an attribute (including
  everything `__init__` sets), assigning the value it already has, and any attribute whose name
  starts with `_`.
- `record.changes` is a list of the recorded changes, oldest first. Changing that list doesn't
  change the record's history, and assigning to `changes` raises `AttributeError`.

```python
class Customer(TrackedRecord):
    def __init__(self, name, tier):
        self.name = name
        self.tier = tier

ada = Customer("Ada", "silver")
ada.tier = "gold"
ada.tier = "gold"                  # same value: not a change
ada.email = "ada@example.com"      # first assignment: not a change
del ada.email
ada.changes     # [('tier', 'silver', 'gold'), ('email', 'ada@example.com', None)]
```
