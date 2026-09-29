from plp import test, hidden, raises
from solution import post_batch


class Ledger:
    """A fake ledger that records every call made to it."""

    def __init__(self, busy=False):
        self.busy = busy
        self.locked = False
        self.entries = []
        self.calls = []

    def __repr__(self):
        return "ledger"

    def lock(self):
        self.calls.append("lock")
        if self.busy:
            raise RuntimeError("ledger is busy")
        self.locked = True

    def post(self, entry):
        self.calls.append(f"post {entry}")
        if entry == 0:
            raise ValueError("the ledger refuses a zero entry")
        self.entries.append(entry)

    def unlock(self):
        self.calls.append("unlock")
        self.locked = False


@test("Posts a batch and unlocks the ledger")
def _():
    ledger = Ledger()
    assert post_batch(ledger, [120, 45, 80]) == 3
    assert ledger.locked is False
    assert ledger.calls == ["lock", "post 120", "post 45", "post 80", "unlock"]


@test("Unlocks the ledger when posting fails, and lets the error through")
def _():
    ledger = Ledger()
    raises(ValueError, post_batch, ledger, [60, 0, 15], match="zero entry")
    assert ledger.locked is False, "The ledger was left locked after the error"
    assert ledger.entries == [60]


@test("An empty batch still locks and unlocks")
def _():
    ledger = Ledger()
    assert post_batch(ledger, []) == 0
    assert ledger.calls == ["lock", "unlock"]


@hidden("Unlocks exactly once when posting fails")
def _():
    ledger = Ledger()
    raises(ValueError, post_batch, ledger, [0])
    assert ledger.calls == ["lock", "post 0", "unlock"]


@hidden("Doesn't unlock a ledger it never locked")
def _():
    ledger = Ledger(busy=True)
    raises(RuntimeError, post_batch, ledger, [10], match="busy")
    assert ledger.calls == ["lock"], "lock() failed, so post() and unlock() shouldn't have been called"


@hidden("Works with any iterable of entries")
def _():
    ledger = Ledger()
    assert post_batch(ledger, (amount for amount in [5, 10])) == 2
    assert ledger.entries == [5, 10]
