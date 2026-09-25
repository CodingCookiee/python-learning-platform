The checkout code prints the right shipping cost, but `order_total` crashes:

```python
order_total(20, 1.5)
# 4.99   <- printed by shipping_cost
# TypeError: unsupported operand type(s) for +: 'int' and 'NoneType'
```

Shipping is £4.99 up to 2 kg, plus £1.25 for every kilogram over that. Fix both functions so that
they **return** their results and print nothing:

```python
shipping_cost(1.5)       # 4.99
shipping_cost(6)         # 9.99
order_total(20, 1.5)     # 24.99
```
