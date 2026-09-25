`User` is written for you. Add a subclass `Admin` that differs in two ways:

- `can(permission)` is `True` for every permission.
- `describe()` returns what a user's `describe()` returns, followed by `" (admin)"`.

Everything else, including creating one, works exactly as for `User`.

```python
root = Admin("Ada", "ada@example.com")
root.describe()        # "Ada <ada@example.com> (admin)"
root.can("delete")     # True
isinstance(root, User) # True
```
