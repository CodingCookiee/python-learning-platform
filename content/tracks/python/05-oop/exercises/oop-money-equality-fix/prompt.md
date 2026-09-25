`Money` compares by value, but two things go wrong as soon as it meets the rest of the shop's code:

```python
Money(5, "EUR") == 5
# AttributeError: 'int' object has no attribute 'amount'   ← should just be False

unique_prices([Money(5, "EUR"), Money(5, "EUR"), Money(7, "EUR")])
# TypeError: cannot use 'Money' as a dict key (unhashable type: 'Money')
# ← should be [Money(5, 'EUR'), Money(7, 'EUR')]
```

Fix `Money` so that comparing it with anything that isn't `Money` gives `False`, and so equal
amounts can be used in sets and as dict keys. Don't change `unique_prices`.
