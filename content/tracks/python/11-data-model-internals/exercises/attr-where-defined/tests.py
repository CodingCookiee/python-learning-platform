from plp import test, hidden
from solution import where_defined


class Account:
    fee = 5

    def statement(self):
        return "monthly"


class Savings(Account):
    rate = 0.02


@test("Finds the instance, a class, a parent, object, or nothing")
def _():
    acct = Savings()
    acct.owner = "Ada"
    assert where_defined(acct, "owner") == "instance"
    assert where_defined(acct, "rate") == "Savings"
    assert where_defined(acct, "statement") == "Account"
    assert where_defined(acct, "__init__") == "object"
    assert where_defined(acct, "overdraft") is None


@test("An instance attribute shadows the class")
def _():
    acct = Savings()
    acct.fee = 0
    assert where_defined(acct, "fee") == "instance"
    assert where_defined(Savings(), "fee") == "Account"


@test("An override is found on the subclass")
def _():
    class Premium(Savings):
        fee = 0

    assert where_defined(Premium(), "fee") == "Premium"
    assert where_defined(Premium(), "rate") == "Savings"


@hidden("Follows the MRO in a diamond")
def _():
    class Document:
        def save(self):
            return "disk"

    class Versioned(Document):
        pass

    class Encrypted(Document):
        def save(self):
            return "encrypted"

    class Contract(Versioned, Encrypted):
        pass

    assert where_defined(Contract(), "save") == "Encrypted"


@hidden("Works on objects with no __dict__")
def _():
    assert where_defined(5, "real") == "int"
    assert where_defined(True, "real") == "int"
    assert where_defined("INV-7", "upper") == "str"
    assert where_defined("INV-7", "total") is None
