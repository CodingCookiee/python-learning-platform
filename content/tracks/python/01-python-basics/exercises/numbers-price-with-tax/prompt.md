`price_with_tax(price, tax_rate)` adds sales tax to a price. Both arrive as strings from the product
database, and the result must be a `Decimal` rounded to the cent, with half a cent rounding **up**.

It mostly works, but customers have noticed that some prices come out a cent short:

```python
price_with_tax("19.99", "0.20")   # Decimal("23.99"): correct
price_with_tax("1.90", "0.05")    # 1.99, but 1.90 plus 5% is exactly 1.995, which rounds up to 2.00
```

Fix it so every price is correct to the cent and comes back as a `Decimal` with two decimal places.
