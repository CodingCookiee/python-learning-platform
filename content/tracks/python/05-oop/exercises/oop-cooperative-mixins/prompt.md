Every record in the CRM exports itself with `to_dict()`. `Record` is written for you. Write two
mixins that each change the export, and two classes that combine them.

- `TypeTagMixin` adds a `"type"` key: the class name in lowercase (`"customer"`).
- `RedactMixin` removes every key named in the class attribute `redacted`, a tuple that is empty
  unless a class sets it.
- `Customer` combines `RedactMixin`, `TypeTagMixin` and `Record`, in that order, and redacts
  `"password"`.
- `Employee` combines `RedactMixin` and `Record`, and redacts `"salary"` and `"bank_account"`.

```python
ada = Customer(name="Ada", email="ada@example.com", password="hunter2")
ada.to_dict()
# {"name": "Ada", "email": "ada@example.com", "type": "customer"}

Employee(name="Grace", salary=85000, bank_account="GB29NWBK").to_dict()
# {"name": "Grace"}
```

The mixins must work with any class that has a `to_dict()`, not just `Record`, and exporting must
never change the record's own `fields`.
