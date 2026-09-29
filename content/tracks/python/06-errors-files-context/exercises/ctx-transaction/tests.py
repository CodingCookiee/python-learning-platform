from plp import test, hidden, raises
from solution import Transaction


@test("Commits every entry when the block finishes")
def _():
    ledger = []
    with Transaction(ledger) as tx:
        tx.add(("rent", -950))
        tx.add(("salary", 2450))
    assert ledger == [("rent", -950), ("salary", 2450)]
    assert tx.committed is True


@test("Adds nothing, and lets the error through, when the block raises")
def _():
    ledger = [("opening balance", 1200)]
    with raises(ValueError, match="card declined"):
        with Transaction(ledger) as tx:
            tx.add(("refund", 20))
            tx.add(("fee", -2))
            raise ValueError("card declined")
    assert ledger == [("opening balance", 1200)], "A failed transaction must not post any entries"


@test("Nothing reaches the ledger before the block ends")
def _():
    ledger = []
    with Transaction(ledger) as tx:
        tx.add(("rent", -950))
        assert ledger == [], "Entries should wait until the block finishes"
    assert ledger == [("rent", -950)]


@test("add refuses entries outside the with block")
def _():
    ledger = []
    tx = Transaction(ledger)
    raises(RuntimeError, tx.add, ("early", 1), match="^transaction is not open$")
    with tx:
        tx.add(("rent", -950))
    raises(RuntimeError, tx.add, ("late", 1), match="^transaction is not open$")
    assert ledger == [("rent", -950)]


@hidden("A rolled-back transaction isn't committed")
def _():
    ledger = []
    tx = Transaction(ledger)
    with raises(KeyError):
        with tx:
            tx.add(("refund", 20))
            raise KeyError("account")
    assert tx.committed is False
    raises(RuntimeError, tx.add, ("late", 1))


@hidden("Appends to the same ledger list, after what's already there")
def _():
    ledger = [("opening balance", 1200)]
    original = ledger
    with Transaction(ledger) as tx:
        tx.add(("salary", 2450))
    assert ledger is original
    assert ledger == [("opening balance", 1200), ("salary", 2450)]


@hidden("An empty transaction commits and changes nothing")
def _():
    ledger = []
    with Transaction(ledger) as tx:
        pass
    assert tx.committed is True
    assert ledger == []
