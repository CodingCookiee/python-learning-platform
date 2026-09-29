The signup form accepts a username only if `is_valid_username` says so:

```python
# signup.py
import re


def is_valid_username(name):
    """True if name can be used as a username.

    A username is 3 to 15 characters long, uses only letters, digits and
    underscores, and starts with a letter.
    """
    return re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{2,14}", name) is not None
```

```python
is_valid_username("ada_lovelace")   # True
is_valid_username("ab")             # False: too short
```

Write tests in `test_signup.py` that pin down every rule. Your tests must pass on this code, and
fail on each of several copies where one rule has been subtly broken, the kind of mistake that's
easy to make when someone "tidies up" the regex later.
