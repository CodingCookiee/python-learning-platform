from plp import test, hidden, raises
from solution import retry


class FlakyCRM:
    """Raises each of the given errors in turn, then succeeds. Counts the attempts."""

    def __init__(self, *errors, result="synced 120"):
        self.errors = list(errors)
        self.result = result
        self.attempts = 0

    def sync(self, *args, **kwargs):
        self.attempts += 1
        if self.errors:
            raise self.errors.pop(0)
        return self.result


@test("Retries, doubling the wait, until it works")
def _():
    waits = []
    crm = FlakyCRM(ConnectionError("reset"), ConnectionError("reset"))

    @retry(times=4, sleep=waits.append)
    def sync_customers():
        """Push changed customers to the CRM."""
        return crm.sync()

    assert sync_customers() == "synced 120"
    assert waits == [0.5, 1.0]
    assert crm.attempts == 3


@test("Re-raises after the last attempt, without a final wait")
def _():
    waits = []
    crm = FlakyCRM(TimeoutError("slow"), TimeoutError("slow"), TimeoutError("still slow"))

    @retry(times=3, delay=2, sleep=waits.append)
    def sync_customers():
        return crm.sync()

    with raises(TimeoutError, match="still slow"):
        sync_customers()
    assert waits == [2, 4]
    assert crm.attempts == 3


@test("Other errors aren't retried")
def _():
    waits = []
    crm = FlakyCRM(ValueError("bad customer record"))

    @retry(times=5, sleep=waits.append)
    def sync_customers():
        return crm.sync()

    raises(ValueError, sync_customers)
    assert (crm.attempts, waits) == (1, [])


@test("Keeps the name and docstring, and passes arguments through")
def _():
    @retry(sleep=lambda seconds: None)
    def push_order(order_id, *, priority="normal"):
        """Send one order to the warehouse."""
        return f"{order_id} sent ({priority})"

    assert push_order("A1", priority="high") == "A1 sent (high)"
    assert push_order.__name__ == "push_order"
    assert push_order.__doc__ == "Send one order to the warehouse."


@hidden("A custom tuple of exceptions")
def _():
    class RateLimited(Exception):
        pass

    waits = []
    crm = FlakyCRM(RateLimited("429"), ConnectionError("reset"))

    @retry(times=3, exceptions=(RateLimited,), delay=1, sleep=waits.append)
    def sync_customers():
        return crm.sync()

    raises(ConnectionError, sync_customers)
    assert (crm.attempts, waits) == (2, [1])


@hidden("times=1 means one attempt and no retries; times below 1 is refused")
def _():
    waits = []
    crm = FlakyCRM(ConnectionError("reset"))
    once = retry(times=1, sleep=waits.append)(crm.sync)
    raises(ConnectionError, once)
    assert (crm.attempts, waits) == (1, [])
    raises(ValueError, retry, times=0)


@hidden("Every call gets a fresh set of attempts")
def _():
    waits = []
    crm = FlakyCRM(ConnectionError(), ConnectionError(), ConnectionError())
    sync = retry(times=2, sleep=waits.append)(crm.sync)
    raises(ConnectionError, sync)
    assert sync() == "synced 120"
    assert waits == [0.5, 0.5]
