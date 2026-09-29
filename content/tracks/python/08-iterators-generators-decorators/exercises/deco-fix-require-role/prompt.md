The admin panel protects dangerous actions with `@require_role(...)`. Each protected function
takes the current user as its first argument, a dict with a `"name"` and a set of `"roles"`. The
module doesn't even import:

```text
TypeError: 'function' object is not subscriptable
```

Fix `require_role` so that it works as written on both functions:

- A user with the role can call the function, which returns what it always did.
- A user without it gets `PermissionError` with the message `"Grace needs the admin role"`
  (their name and the role), and the function doesn't run.
- The protected functions keep their names and docstrings.

```python
ada = {"name": "Ada", "roles": {"admin", "billing"}}
grace = {"name": "Grace", "roles": {"support"}}
delete_customer(ada, "C42")     # "Ada deleted C42"
delete_customer(grace, "C42")   # PermissionError: Grace needs the admin role
```
