This `Employee` class was ported from Java, getters and setters and all. Make it Pythonic:

- `name` becomes a plain attribute.
- `salary` is read and assigned like an attribute, and still refuses a negative value with
  `ValueError`, at creation and afterwards.
- `monthly_salary` is a read-only attribute: the salary divided by 12, rounded to 2 decimals.
- No `get_…` or `set_…` methods remain.

```python
ada = Employee("Ada", 60000)
ada.name              # "Ada"
ada.salary = 66000
ada.monthly_salary    # 5500.0
ada.salary = -1       # ValueError
```
