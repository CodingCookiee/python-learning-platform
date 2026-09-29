import re
from functools import cache

import plp
from plp import pytest_run, solution_source, source_uses


# Each check runs pytest, which takes a few seconds (the first run imports it and FastAPI). The
# per-test limit only watches tests.py itself here, so it's switched off; the drill's timeout applies.
def test(name):
    return plp.test(name, timeout=None)


def hidden(name):
    return plp.hidden(name, timeout=None)


MODULE, TEST_FILE = "tours.py", "test_tours.py"

CORRECT = '''
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

app = FastAPI()
BOOKINGS: dict[str, dict] = {}


def get_bookings() -> dict[str, dict]:
    return BOOKINGS


def get_now() -> datetime:
    return datetime.now(UTC)


type Bookings = Annotated[dict[str, dict], Depends(get_bookings)]
type Now = Annotated[datetime, Depends(get_now)]


def find_booking(bookings: dict, booking_id: str) -> dict:
    if booking_id not in bookings:
        raise HTTPException(404, f"Booking {booking_id} not found")
    return bookings[booking_id]


@app.get("/bookings/{booking_id}")
def get_booking(booking_id: str, bookings: Bookings):
    return find_booking(bookings, booking_id)


@app.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str, bookings: Bookings, now: Now):
    booking = find_booking(bookings, booking_id)
    if booking["starts_at"] - now < timedelta(hours=48):
        raise HTTPException(409, "Too late to cancel online")
    booking["status"] = "cancelled"
    return booking
'''


def planted(old, new, source=None):
    """A copy of the correct module with one bug planted in it."""
    source = CORRECT if source is None else source
    assert old in source, f"mutant doesn't apply: {old!r}"
    return source.replace(old, new)


REFUSES_AT_48_HOURS = planted('now < timedelta(hours=48)', 'now <= timedelta(hours=48)')
IGNORES_THE_CLOCK = planted('booking["starts_at"] - now <', 'booking["starts_at"] - datetime.now(UTC) <')
NOT_SAVED = planted(
    '''    booking["status"] = "cancelled"
    return booking''',
    '''    return {**booking, "status": "cancelled"}''',
)
CRASHES_ON_UNKNOWN = planted(
    '''    booking = find_booking(bookings, booking_id)
    if booking["starts_at"]''',
    '''    booking = bookings[booking_id]
    if booking["starts_at"]''',
)


@cache
def run(module_source):
    """Run the learner's tests with pytest against one version of tours.py."""
    return pytest_run({MODULE: module_source, TEST_FILE: solution_source()})


def report(result):
    """pytest's own explanation of each failure: the E lines under each test's heading."""
    out, heading, shown = [], None, 0
    for line in result.output.splitlines():
        match = re.fullmatch(r"_{2,} (.+?) _{2,}", line)
        if match:
            heading, shown = match.group(1), 0
        elif line.startswith("E ") and heading and shown < 3:
            if shown == 0:
                out.append(heading + ":")
            out.append("    " + line[1:].strip().removeprefix("AssertionError: "))
            shown += 1
        elif "short test summary" in line:
            break
    return "\n".join(out[:15])


def clean(result):
    return result.total > 0 and not result.failed and not result.errors


def catches(buggy_source):
    """True if the learner's tests fail (or error) on the buggy copy."""
    assert clean(run(CORRECT)), "Make your tests pass cleanly on the correct code first (see the checks above)"
    result = run(buggy_source)
    return bool(result.failed or result.errors)


@test("Your tests pass on the correct tours.py")
def _():
    result = run(CORRECT)
    assert result.total > 0, "pytest didn't collect any tests. Name each test function test_something."
    assert result.errors == [], "pytest couldn't run some of your tests:\n" + report(result)
    assert result.failed == [], "These fail on the correct code, so they expect the wrong thing:\n" + report(result)


@test("Pins the clock by overriding get_now")
def _():
    assert source_uses(name="dependency_overrides") and source_uses(name="get_now"), (
        "Override get_now with app.dependency_overrides so each test chooses the time"
    )


@test("Catches a service that refuses cancellations exactly 48 hours before")
def _():
    assert catches(REFUSES_AT_48_HOURS), (
        "A bug slipped through: cancelling exactly 48 hours before the tour was refused, and all "
        "your tests still passed. Test the boundary itself."
    )


@hidden("Catches a service that ignores the clock dependency")
def _():
    assert catches(IGNORES_THE_CLOCK), (
        "A bug slipped through: the service read the real clock instead of get_now, and all your "
        "tests still passed. A test for a refused cancellation (47 hours before) would catch it."
    )


@hidden("Catches a cancellation that isn't saved")
def _():
    assert catches(NOT_SAVED), (
        "A bug slipped through: the response said cancelled, but the stored booking never changed, "
        "and all your tests still passed. Fetch the booking again after cancelling it."
    )


@hidden("Catches a crash for an unknown booking")
def _():
    assert catches(CRASHES_ON_UNKNOWN), (
        "A bug slipped through: cancelling a booking that doesn't exist crashed instead of "
        "answering 404, and all your tests still passed."
    )
