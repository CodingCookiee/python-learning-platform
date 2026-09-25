from datetime import date

from plp import test, hidden
from solution import Booking


def raises_value_error(action):
    try:
        action()
    except ValueError:
        return True
    return False


@test("Converts dates and computes nights and total")
def _():
    stay = Booking("Ada", "2026-10-01", date(2026, 10, 4), 120.0)
    assert (stay.nights, stay.total) == (3, 360.0)
    assert repr(stay) == (
        "Booking(guest='Ada', check_in=datetime.date(2026, 10, 1), "
        "check_out=datetime.date(2026, 10, 4), nightly_rate=120.0, nights=3, total=360.0)"
    )


@test("Refuses a check-out that isn't after check-in")
def _():
    assert raises_value_error(lambda: Booking("Grace", "2026-10-04", "2026-10-01", 120.0)), (
        "check_out before check_in should raise ValueError"
    )
    assert raises_value_error(lambda: Booking("Grace", "2026-10-04", "2026-10-04", 120.0)), (
        "A zero-night booking should raise ValueError"
    )


@test("nights and total aren't __init__ parameters")
def _():
    try:
        Booking("Ada", "2026-10-01", "2026-10-04", 120.0, 3, 360.0)
    except TypeError:
        return
    raise AssertionError("Booking(..., 3, 360.0) should raise TypeError: nights and total are computed")


@hidden("Refuses a rate that isn't positive")
def _():
    assert raises_value_error(lambda: Booking("Ada", "2026-10-01", "2026-10-02", 0)), "rate 0 should raise ValueError"


@hidden("Works across a month end and rounds the total")
def _():
    stay = Booking("Linus", date(2026, 9, 29), date(2026, 10, 2), 89.999)
    assert (stay.nights, stay.total) == (3, 270.0)
    assert stay.check_in == date(2026, 9, 29)


@hidden("Equal bookings compare equal")
def _():
    assert Booking("Ada", "2026-10-01", "2026-10-04", 120.0) == Booking("Ada", date(2026, 10, 1), date(2026, 10, 4), 120.0)
