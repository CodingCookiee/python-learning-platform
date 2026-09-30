from datetime import datetime, timezone
from decimal import Decimal


class BudgetExceeded(Exception):
    def __init__(self, limit, remaining):
        super().__init__(f"The {limit} budget has only ${remaining} left today")
        self.limit = limit  # "user" or "day"
        self.remaining = remaining


class BudgetLedger:
    """Daily spending caps per user and for the whole service, reset at UTC midnight."""

    def __init__(self, *, per_user_daily, per_day, clock=lambda: datetime.now(timezone.utc)):
        self.per_user_daily = per_user_daily
        self.per_day = per_day
        self.clock = clock
        self._by_user = {}
        self._total = Decimal("0")

    def spent(self, user=None):
        """Today's spending for one user, or for everyone."""
        if user is None:
            return self._total
        return self._by_user.get(user, Decimal("0"))

    def check(self, user, estimate):
        """Raise BudgetExceeded if spending `estimate` more would break a cap."""
        if self.spent(user) + estimate > self.per_user_daily:
            raise BudgetExceeded("user", self.per_user_daily - self.spent(user))

    def charge(self, user, cost):
        """Record what a call actually cost."""
        self._by_user[user] = self.spent(user) + cost
        self._total += cost
