`property` is written in C, but nothing about it needs to be. Write `Property`, a pure-Python
version that works as a drop-in replacement:

- `@Property` above a method makes a read-only attribute that calls it. `@name.setter` and
  `@name.deleter` add a setter and a deleter, each returning a **new** `Property` that keeps the
  functions it already had.
- Assigning to an attribute with no setter, deleting one with no deleter, or reading one with no
  getter raises `AttributeError` whose message names the attribute.
- It must behave like `property` even when the instance dict holds the same name: the
  `Property` always wins.
- Read on the class, it gives the `Property` itself, and its `__doc__` is the getter's docstring.

```python
class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    @Property
    def salary(self):
        """Annual salary."""
        return self._salary

    @salary.setter
    def salary(self, value):
        if value < 0:
            raise ValueError("salary can't be negative")
        self._salary = value

    @Property
    def monthly(self):
        return round(self.salary / 12, 2)

ada = Employee("Ada", 60000)
ada.salary = 66000
ada.monthly          # 5500.0
ada.monthly = 1      # AttributeError: monthly has no setter
Employee.salary.__doc__    # "Annual salary."
```

Don't use the built-in `property` anywhere.
