`accounts.py` stores accounts in a database that every test shares (here it's a module-level dict,
but a real database has the same problem). Anything a test creates and doesn't delete is still
there for the next test, and creating the same email twice raises `ValueError`.

```python
# accounts.py
from dataclasses import dataclass
from itertools import count

PLANS = ("free", "pro", "team")

_rows = {}  # the shared database: account id -> Account
_ids = count(1)


@dataclass
class Account:
    id: int
    email: str
    plan: str = "free"


def create_account(email, plan="free"):
    """Register an account. The email is stored trimmed and lowercased, and must be unique."""
    email = email.strip().lower()
    if any(row.email == email for row in _rows.values()):
        raise ValueError(f"{email} is already registered")
    if plan not in PLANS:
        raise ValueError(f"unknown plan: {plan}")
    account = Account(next(_ids), email, plan)
    _rows[account.id] = account
    return account


def find(email):
    """The account registered with this email (typed any way), or None."""
    email = email.strip().lower()
    return next((row for row in _rows.values() if row.email == email), None)


def change_plan(account_id, plan):
    if plan not in PLANS:
        raise ValueError(f"unknown plan: {plan}")
    _rows[account_id].plan = plan


def delete_account(account_id):
    del _rows[account_id]


def all_accounts():
    return list(_rows.values())
```

1. Turn the starter's `account` fixture into a `yield` fixture that deletes the account after each
   test. The grader checks the database after every test, and a leftover account fails the drill.
2. Write tests that use it to check that emails are stored cleaned up, that `find` works however
   the email is typed, and that `change_plan` really changes the stored plan.

Your tests must pass on this code and catch the bugs planted in copies of it.
