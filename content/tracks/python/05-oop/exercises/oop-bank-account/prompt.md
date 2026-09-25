Write a `BankAccount` class.

- `BankAccount(owner, balance=0)` stores `owner` and `balance`.
- `deposit(amount)` adds to the balance and returns the new balance.
- `withdraw(amount)` takes from the balance and returns the new balance.
- `transfer_to(other, amount)` moves money from this account into another `BankAccount`.

Money never appears or disappears by mistake: raise `ValueError` for an amount that is zero or
negative, or for a withdrawal or transfer larger than the balance. When an operation is refused,
no balance changes.

```python
ada = BankAccount("Ada", 100)
ada.deposit(50)          # 150
ada.withdraw(30)         # 120

grace = BankAccount("Grace")
ada.transfer_to(grace, 20)
ada.balance, grace.balance   # (100, 20)

ada.withdraw(500)        # ValueError
```
