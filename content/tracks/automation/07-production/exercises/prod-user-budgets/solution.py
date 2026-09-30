from collections import defaultdict
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
        self._by_user = defaultdict(Decimal)  # (day, user) -> dollars
        self._by_day = defaultdict(Decimal)  # day -> dollars

    def _today(self):
        return self.clock().astimezone(timezone.utc).date()

    def spent(self, user=None):
        """Today's spending for one user, or for everyone."""
        today = self._today()
        return self._by_user[(today, user)] if user is not None else self._by_day[today]

    def check(self, user, estimate):
        """Raise BudgetExceeded if spending `estimate` more would break a cap."""
        user_left = self.per_user_daily - self.spent(user)
        if estimate > user_left:
            raise BudgetExceeded("user", user_left)
        day_left = self.per_day - self.spent()
        if estimate > day_left:
            raise BudgetExceeded("day", day_left)

    def charge(self, user, cost):
        """Record what a call actually cost."""
        if cost < 0:
            raise ValueError(f"A cost can't be negative: {cost}")
        today = self._today()
        self._by_user[(today, user)] += cost
        self._by_day[today] += cost
