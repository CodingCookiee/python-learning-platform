from datetime import datetime, timezone

import httpx

from plp import hidden, test
from solution import retry_after

NOW = datetime(2026, 9, 30, 11, 59, 30, tzinfo=timezone.utc)


def response(value=None, status=429):
    return httpx.Response(status, headers={} if value is None else {"Retry-After": value})


@test("Seconds, a date, and no header")
def _():
    assert retry_after(response("120"), now=NOW) == 120.0
    assert retry_after(response("Wed, 30 Sep 2026 12:00:00 GMT", status=503), now=NOW) == 30.0
    assert retry_after(response(), now=NOW) is None


@test("Returns a float for the seconds form")
def _():
    assert type(retry_after(response("7"), now=NOW)) is float
    assert retry_after(response(" 7 "), now=NOW) == 7.0
    assert retry_after(response("0"), now=NOW) == 0.0


@test("A date in the past means don't wait")
def _():
    assert retry_after(response("Wed, 30 Sep 2026 11:00:00 GMT"), now=NOW) == 0.0


@test("Text that isn't either form is ignored")
def _():
    assert retry_after(response("soon"), now=NOW) is None
    assert retry_after(response("-5"), now=NOW) is None
    assert retry_after(response("1.5"), now=NOW) is None


@hidden("Dates an hour and a day ahead")
def _():
    assert retry_after(response("Wed, 30 Sep 2026 12:59:30 GMT"), now=NOW) == 3600.0
    assert retry_after(response("Thu, 01 Oct 2026 11:59:30 GMT"), now=NOW) == 86400.0


@hidden("An empty header is ignored")
def _():
    assert retry_after(response(""), now=NOW) is None
