A basket is a list of `(name, quantity, unit_price)` tuples. Write `line_totals(basket)` that returns
the total for each line (quantity times unit price), rounded to the cent, in basket order:

```python
line_totals([("Coffee beans", 2, 8.50), ("Oat milk", 3, 1.75)])   # [17.0, 5.25]
```

Try writing it as a single list comprehension.
