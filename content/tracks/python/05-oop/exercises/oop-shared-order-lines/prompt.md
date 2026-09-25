The shop's `Order` class works in every test that uses one order. With two orders, lines added to
one show up on the other:

```python
first = Order("Ada")
second = Order("Grace")
first.add_line("Coffee beans", 2, 12.5)
second.lines     # [("Coffee beans", 2, 12.5)]  ← should be []
```

Fix the class so each order keeps its own lines. Everything else about it (the methods, the
`status` default of `"open"`, `ship()`) should keep working exactly as it does now.
