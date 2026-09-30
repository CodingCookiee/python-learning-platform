from datetime import datetime, timedelta, timezone
from decimal import Decimal

from plp import hidden, raises, test
from solution import BudgetExceeded, BudgetLedger

LATE = datetime(2026, 10, 5, 23, 50, tzinfo=timezone.utc)


def ledger_at(when, per_user="0.50", per_day="100"):
    now = [when]
    ledger = BudgetLedger(per_user_daily=Decimal(per_user), per_day=Decimal(per_day), clock=lambda: now[0])
    return ledger, now


@test("Stops the example's user, then lets them in after midnight")
def _():
    ledger, now = ledger_at(LATE)
    ledger.charge("u_3f9a", Decimal("0.49"))
    with raises(BudgetExceeded, what='ledger.check("u_3f9a", Decimal("0.02"))') as caught:
        ledger.check("u_3f9a", Decimal("0.02"))
    assert (caught.value.limit, caught.value.remaining) == ("user", Decimal("0.01"))
    now[0] = datetime(2026, 10, 6, 0, 1, tzinfo=timezone.utc)
    ledger.check("u_3f9a", Decimal("0.02"))
    assert ledger.spent("u_3f9a") == Decimal("0")


@test("Exactly reaching a cap is allowed, and users are separate")
def _():
    ledger, _now = ledger_at(LATE)
    ledger.charge("u_3f9a", Decimal("0.30"))
    ledger.check("u_3f9a", Decimal("0.20"))
    ledger.check("u_77c1", Decimal("0.50"))
    assert (ledger.spent("u_3f9a"), ledger.spent("u_77c1"), ledger.spent()) == (Decimal("0.30"), Decimal("0"), Decimal("0.30"))


@test("The service-wide daily cap stops everyone")
def _():
    ledger, _now = ledger_at(LATE, per_user="0.50", per_day="1.00")
    for user in ("u_1", "u_2", "u_3", "u_4"):
        ledger.charge(user, Decimal("0.25"))
    with raises(BudgetExceeded, what='ledger.check("u_5", Decimal("0.01"))') as caught:
        ledger.check("u_5", Decimal("0.01"))
    assert (caught.value.limit, caught.value.remaining) == ("day", Decimal("0"))


@test("Days are UTC days, whatever time zone the clock uses")
def _():
    berlin_summer = timezone(timedelta(hours=2))
    ledger, now = ledger_at(datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc))
    ledger.charge("u_3f9a", Decimal("0.40"))
    now[0] = datetime(2026, 10, 6, 1, 30, tzinfo=berlin_summer)       # 23:30 UTC on the 5th
    raises(BudgetExceeded, ledger.check, "u_3f9a", Decimal("0.20"))
    now[0] = datetime(2026, 10, 6, 2, 30, tzinfo=berlin_summer)       # 00:30 UTC on the 6th
    ledger.check("u_3f9a", Decimal("0.20"))


@hidden("The user cap is checked before the daily cap, and negative costs are refused")
def _():
    ledger, _now = ledger_at(LATE, per_user="0.50", per_day="0.60")
    ledger.charge("u_1", Decimal("0.45"))
    with raises(BudgetExceeded, what="the check") as caught:
        ledger.check("u_1", Decimal("0.20"))
    assert caught.value.limit == "user"
    raises(ValueError, ledger.charge, "u_1", Decimal("-0.10"))
    assert ledger.spent() == Decimal("0.45")


@hidden("Yesterday's daily total doesn't count today")
def _():
    ledger, now = ledger_at(LATE, per_user="5", per_day="1.00")
    ledger.charge("u_1", Decimal("1.00"))
    raises(BudgetExceeded, ledger.check, "u_2", Decimal("0.01"))
    now[0] = LATE + timedelta(minutes=20)
    ledger.check("u_2", Decimal("1.00"))
    assert ledger.spent() == Decimal("0")
