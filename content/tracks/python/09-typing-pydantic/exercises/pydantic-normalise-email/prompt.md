The same customer keeps signing up twice, as `Ada@Example.com` and ` ada@example.com `. Add a field
validator to `Signup` that cleans the email before it's stored:

- Strip surrounding spaces and lowercase it.
- Then check its shape: some text, an `@`, and a domain containing a dot. Otherwise raise
  `ValueError("not an email address")`, which Pydantic reports as a `ValidationError`.

```python
Signup(email=" Ada@Example.COM ", name="Ada").email    # "ada@example.com"
Signup(email="ada@example", name="Ada")                # ValidationError: ... not an email address
```
