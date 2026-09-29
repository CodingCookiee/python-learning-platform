from plp import test, hidden, raises
from solution import record_payment, transaction


class FakeDB:
    """Records every call, in order."""

    def __init__(self):
        self.log = []

    def begin(self):
        self.log.append("begin")

    def commit(self):
        self.log.append("commit")

    def rollback(self):
        self.log.append("rollback")

    def execute(self, statement):
        self.log.append(statement)


@test("A failed payment is rolled back, and the error still gets out")
def _():
    db = FakeDB()
    with raises(ValueError, match="amount must be positive"):
        record_payment(db, "A2", 0)
    assert db.log == ["begin", "insert payment A2 0", "rollback"]


@test("A successful payment is committed")
def _():
    db = FakeDB()
    record_payment(db, "A1", 12.5)
    assert db.log == ["begin", "insert payment A1 12.5", "update order A1 paid", "commit"]


@test("The block gets the database")
def _():
    db = FakeDB()
    with transaction(db) as active:
        assert active is db
        active.execute("insert audit")
    assert db.log == ["begin", "insert audit", "commit"]


@hidden("Any kind of error rolls back, and nothing is committed")
def _():
    db = FakeDB()
    with raises(KeyError):
        with transaction(db):
            db.execute("insert order A3")
            {}["customer_id"]
    assert db.log == ["begin", "insert order A3", "rollback"]


@hidden("Transactions after a failure still work")
def _():
    db = FakeDB()
    raises(ValueError, record_payment, db, "A2", -1)
    record_payment(db, "A3", 5)
    assert db.log[-1] == "commit"
    assert db.log.count("begin") == 2
