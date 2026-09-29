`find_user(conn, email)` looks up a user's `(id, name)` by email and returns `None` if there's no
such user. It builds the query with an f-string, so anyone can type an "email" that rewrites it:

```python
find_user(conn, "ada@example.com")        # (2, "Ada Lovelace")
find_user(conn, "' OR '1'='1")            # (1, "Site admin")   ← should be None
find_user(conn, "o'brien@example.com")    # OperationalError   ← should find Niamh O'Brien
```

Fix it so every email, whatever it contains, is treated as a value.
