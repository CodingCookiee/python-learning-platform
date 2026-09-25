Write a `User` class that keeps a registry of every user, so no two accounts can share an email.

- Class attributes: `ROLES = ("member", "editor", "admin")`, in order of rank, and `by_email`, a
  dict shared by the whole class that maps each registered email to its `User`.
- `User(email, name, role="member")` stores the email normalised (surrounding spaces removed,
  lowercase), plus `name` and `role`, and registers the user in `User.by_email`.
- Raise `ValueError` if the email is already registered (after normalising), or if the role isn't
  one of `ROLES`. A refused user is never registered.
- `promote()` moves the user one role up. An admin stays an admin.
- `remove()` takes the user out of the registry, which frees the email for a new account.

```python
ada = User("  Ada@Example.com ", "Ada")
ada.email                            # "ada@example.com"
User.by_email["ada@example.com"] is ada   # True

User("ADA@example.com", "Impostor")  # ValueError: already registered

ada.promote()
ada.role                             # "editor"
```
