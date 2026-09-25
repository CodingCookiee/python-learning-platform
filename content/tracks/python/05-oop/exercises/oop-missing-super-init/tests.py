from plp import test, hidden
from solution import BankAccount, SavingsAccount


@test("Deposits with a bonus, records history and adds interest")
def _():
    savings = SavingsAccount("Grace", 0.03, balance=1000)
    savings.deposit(2000)
    assert savings.balance == 3005
    assert savings.history == [("deposit", 2005)]
    savings.add_interest()
    assert savings.balance == 3095.15


@test("Sets up everything a BankAccount has")
def _():
    savings = SavingsAccount("Grace", 0.03)
    assert (savings.owner, savings.balance, savings.history, savings.rate) == ("Grace", 0, [], 0.03)


@test("Small deposits earn no bonus")
def _():
    savings = SavingsAccount("Grace", 0.03)
    savings.deposit(1000)
    assert savings.balance == 1000
    assert savings.history == [("deposit", 1000)]


@hidden("Plain bank accounts are unchanged")
def _():
    current = BankAccount("Ada", 50)
    current.deposit(2000)
    assert current.balance == 2050
    assert current.history == [("deposit", 2000)]


@hidden("Two savings accounts keep separate histories")
def _():
    first = SavingsAccount("Ada", 0.01)
    second = SavingsAccount("Grace", 0.02)
    first.deposit(10)
    assert second.history == []
