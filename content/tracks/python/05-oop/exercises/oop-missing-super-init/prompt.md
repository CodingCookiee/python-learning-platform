`SavingsAccount` adds an interest rate and a deposit bonus to `BankAccount`, but it doesn't work:

```python
savings = SavingsAccount("Grace", 0.03, balance=1000)
savings.balance     # AttributeError: 'SavingsAccount' object has no attribute 'balance'
```

Fix `SavingsAccount` so that it builds on `BankAccount` instead of bypassing it. When you're done:

```python
savings = SavingsAccount("Grace", 0.03, balance=1000)
savings.deposit(2000)       # over 1,000, so it earns a 5.00 bonus
savings.balance             # 3005
savings.history             # [("deposit", 2005)]
savings.add_interest()
savings.balance             # 3095.15
```

Don't change `BankAccount`.
