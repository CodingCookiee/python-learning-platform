Sign-ups arrive from a web form as a dict of strings. Write a Pydantic model, `Customer`, that
validates and converts them:

| Field | Type | Rules |
|-------|------|-------|
| `email` | str | required |
| `name` | str | required, at least 1 character |
| `marketing_opt_in` | bool | defaults to `False` |
| `loyalty_points` | int | defaults to `0`, can't be negative |

Anything that breaks a rule must raise `pydantic.ValidationError`.

```python
form = {"email": "ada@example.com", "name": "Ada", "marketing_opt_in": "true", "loyalty_points": "120"}
ada = Customer.model_validate(form)
ada.marketing_opt_in, ada.loyalty_points      # (True, 120)
Customer(email="grace@example.com", name="Grace").loyalty_points    # 0
Customer(email="alan@example.com", name="")   # ValidationError
```
