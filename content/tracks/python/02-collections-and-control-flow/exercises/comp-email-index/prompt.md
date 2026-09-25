`users` maps user IDs to email addresses, exactly as people typed them. The login form needs the
opposite: find a user ID from an email. Write `index_by_email(users)` that returns a new dict from
each **normalised** email (spaces stripped, lower-cased) to its user ID:

```python
index_by_email({101: "Ada@Example.com", 102: " grace@example.com "})
# {"ada@example.com": 101, "grace@example.com": 102}
```

Every user has a different address. A dict comprehension does this in one line.
