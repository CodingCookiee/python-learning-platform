Write a `CurrentAccount` class that remembers every transaction and can print a bank statement.

- `CurrentAccount(owner, opening_balance=0)`
- `deposit(amount, memo)` and `withdraw(amount, memo)` change the balance. Both raise `ValueError`
  for an amount that isn't positive, and `withdraw` also raises it when the amount is more than the
  balance. A refused transaction isn't recorded.
- `balance` is an attribute that always holds the current balance.
- `statement()` returns the statement as one string, lines separated by `\n`.

```python
account = CurrentAccount("Ada", 100)
account.deposit(2500, "Salary")
account.withdraw(1200, "Rent")
print(account.statement())
```

```text
Statement for Ada
Opening                     100.00
Salary        +2,500.00   2,600.00
Rent          -1,200.00   1,400.00
Closing                   1,400.00
```

The columns, exactly:

- the memo (or `Opening`/`Closing`), cut to 12 characters and left-aligned in 12,
- the amount with its sign, a thousands separator and two decimals, right-aligned in 11 (blank on
  the opening and closing lines),
- the balance after that line, with a thousands separator and two decimals, right-aligned in 11.

An account with no transactions has just the three lines: the header, `Opening` and `Closing`.
