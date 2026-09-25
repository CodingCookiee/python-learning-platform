from plp import test, hidden
from solution import CurrentAccount


def raises_value_error(action):
    try:
        action()
    except ValueError:
        return True
    return False


@test("Prints the statement from the example")
def _():
    account = CurrentAccount("Ada", 100)
    account.deposit(2500, "Salary")
    account.withdraw(1200, "Rent")
    assert account.statement().splitlines() == [
        "Statement for Ada",
        "Opening                     100.00",
        "Salary        +2,500.00   2,600.00",
        "Rent          -1,200.00   1,400.00",
        "Closing                   1,400.00",
    ]


@test("Keeps the balance up to date")
def _():
    account = CurrentAccount("Ada", 100)
    account.deposit(2500, "Salary")
    account.withdraw(1200, "Rent")
    assert account.balance == 1400


@test("An account with no transactions")
def _():
    assert CurrentAccount("Grace").statement() == (
        "Statement for Grace\n"
        "Opening                       0.00\n"
        "Closing                       0.00"
    )


@test("A refused withdrawal raises ValueError and isn't recorded")
def _():
    account = CurrentAccount("Ada", 50)
    assert raises_value_error(lambda: account.withdraw(80, "Laptop")), "withdraw(80) should raise ValueError"
    assert account.balance == 50
    assert "Laptop" not in account.statement()


@hidden("Cuts long memos to 12 characters")
def _():
    account = CurrentAccount("Ada")
    account.deposit(12.5, "Refund from the coffee shop")
    assert account.statement().splitlines()[2] == "Refund from      +12.50      12.50"


@hidden("Refuses zero and negative amounts")
def _():
    account = CurrentAccount("Ada", 50)
    assert raises_value_error(lambda: account.deposit(0, "Nothing")), "deposit(0) should raise ValueError"
    assert raises_value_error(lambda: account.withdraw(-5, "Odd")), "withdraw(-5) should raise ValueError"
    assert account.balance == 50


@hidden("Two accounts keep separate histories")
def _():
    ada = CurrentAccount("Ada")
    grace = CurrentAccount("Grace")
    ada.deposit(10, "Gift")
    assert len(grace.statement().splitlines()) == 3
