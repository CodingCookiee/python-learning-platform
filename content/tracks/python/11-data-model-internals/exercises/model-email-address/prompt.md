A mailing list keeps subscribers in a set and their preferences in a dict keyed by address, so an
address has to be a well-behaved key. Email has one rule that makes this interesting: the domain
is case-insensitive, but the part before the `@` (the local part) may be case-sensitive, so
`Ada@Example.COM` and `Ada@example.com` are the same mailbox while `ada@example.com` might not be.

Write a class `EmailAddress(text)`:

- `local` is everything before the last `@`, exactly as given; `domain` is everything after it,
  lower-cased. No `@`, an empty local part or an empty domain raises `ValueError`.
- `str()` gives `local@domain`, and `repr()` gives `EmailAddress('local@domain')`.
- Two addresses are equal when their local parts match exactly and their domains match. They work
  in sets and as dict keys, and an `EmailAddress` is never equal to a plain string.
- It can't be changed: assigning to `local`, `domain` or any new attribute raises `AttributeError`.

```python
ada = EmailAddress("Ada@Example.COM")
ada.domain                                   # "example.com"
str(ada)                                     # "Ada@example.com"
ada == EmailAddress("Ada@example.com")       # True
ada == EmailAddress("ada@example.com")       # False
len({ada, EmailAddress("Ada@EXAMPLE.com")})  # 1
```
