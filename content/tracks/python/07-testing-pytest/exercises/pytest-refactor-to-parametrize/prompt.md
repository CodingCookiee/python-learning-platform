The signup form rates passwords with this function:

```python
# strength.py
def password_strength(password):
    """"weak", "medium" or "strong".

    Under 8 characters is always weak. From 8 characters, a password is strong if it
    has a letter, a digit and a symbol (anything that isn't a letter or digit), medium
    if it has two of those three kinds, and weak with only one.
    """
    if len(password) < 8:
        return "weak"
    kinds = sum([
        any(char.isalpha() for char in password),
        any(char.isdigit() for char in password),
        any(not char.isalnum() for char in password),
    ])
    return {3: "strong", 2: "medium"}.get(kinds, "weak")
```

Its tests work, but they're six copies of the same three lines. Refactor `test_strength.py` into
**one** parametrized test that covers the same six cases, with an id for each case that says
what it is about (for example `"seven-characters"`). The refactored test must still pass on the
code above and still catch the bugs the original tests catch.
