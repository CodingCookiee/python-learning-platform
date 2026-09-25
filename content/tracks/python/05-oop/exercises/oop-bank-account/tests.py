from plp import test, hidden
from solution import BankAccount


def raises_value_error(action):
    try:
        action()
    except ValueError:
        return True
    return False


@test("Deposits, withdraws and transfers")
def _():
    ada = BankAccount("Ada", 100)
    assert ada.deposit(50) == 150
    assert ada.withdraw(30) == 120
    grace = BankAccount("Grace")
    ada.transfer_to(grace, 20)
    assert (ada.balance, grace.balance) == (100, 20)


@test("A new account starts at zero")
def _():
    account = BankAccount("Grace")
    assert account.owner == "Grace"
    assert account.balance == 0


@test("Refuses to withdraw more than the balance, and keeps the balance")
def _():
    ada = BankAccount("Ada", 100)
    assert raises_value_error(lambda: ada.withdraw(500)), "withdraw(500) should raise ValueError"
    assert ada.balance == 100


@test("Refuses zero and negative amounts")
def _():
    ada = BankAccount("Ada", 100)
    assert raises_value_error(lambda: ada.deposit(0)), "deposit(0) should raise ValueError"
    assert raises_value_error(lambda: ada.deposit(-5)), "deposit(-5) should raise ValueError"
    assert raises_value_error(lambda: ada.withdraw(-5)), "withdraw(-5) should raise ValueError"
    assert ada.balance == 100


@hidden("A refused transfer changes neither account")
def _():
    ada = BankAccount("Ada", 10)
    grace = BankAccount("Grace", 5)
    assert raises_value_error(lambda: ada.transfer_to(grace, 50)), "transfer_to should raise ValueError"
    assert (ada.balance, grace.balance) == (10, 5)


@hidden("Can withdraw the whole balance")
def _():
    ada = BankAccount("Ada", 40)
    assert ada.withdraw(40) == 0
