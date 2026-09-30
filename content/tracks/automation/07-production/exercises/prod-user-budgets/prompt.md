The $610 weekend came from one customer's script. Finish `BudgetLedger`, which caps the support
bot's spending per user per day and for the whole service per day. Amounts are `Decimal` dollars.
The starter's version caps users forever, never resets, and ignores the daily cap.

- `BudgetLedger(*, per_user_daily, per_day, clock)`: `clock()` returns the current time as a
  timezone-aware `datetime`. Days are **UTC** days: everything resets at UTC midnight, whatever
  time zone the clock reports in.
- `spent(user)` is what that user has spent today; `spent()` with no user is the whole service's
  total today.
- `check(user, estimate)` raises `BudgetExceeded` (in the starter) if spending `estimate` more would
  take the user over `per_user_daily` (with `limit="user"`), or else the service over `per_day`
  (with `limit="day"`). `remaining` is what that cap has left. Exactly reaching a cap is allowed.
- `charge(user, cost)` records an actual cost against the user and the day. A negative cost raises
  `ValueError`.

```python
now = [datetime(2026, 10, 5, 23, 50, tzinfo=timezone.utc)]
ledger = BudgetLedger(per_user_daily=Decimal("0.50"), per_day=Decimal("100"), clock=lambda: now[0])
ledger.charge("u_3f9a", Decimal("0.49"))
ledger.check("u_3f9a", Decimal("0.02"))       # BudgetExceeded: limit "user", remaining Decimal("0.01")
now[0] = datetime(2026, 10, 6, 0, 1, tzinfo=timezone.utc)
ledger.check("u_3f9a", Decimal("0.02"))       # fine: a new day
```
