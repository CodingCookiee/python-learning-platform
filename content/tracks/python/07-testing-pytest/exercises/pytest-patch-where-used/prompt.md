Signing up sends a welcome email:

```python
# mailer.py
def send_email(to, subject, body):
    """Send an email through the company's mail server."""
    ...  # in the test environment this raises RuntimeError, so a real send can't go unnoticed
```

```python
# signup.py
from mailer import send_email


def register(email):
    """Register a customer and send them a welcome email. Returns the stored address."""
    address = email.strip().lower()
    if "@" not in address:
        raise ValueError(f"not an email address: {email!r}")
    send_email(address, "Welcome to Harbour Books", f"Hi {address}, thanks for signing up.")
    return address
```

The tests patch `send_email` so nothing is really sent, but two of them fail with
`RuntimeError: tried to send a real email`, and the third passes without testing anything.
Fix the patching in `test_signup.py` so that all three tests pass and really check the email.
They're graded against the code above and against copies with bugs planted in it.
