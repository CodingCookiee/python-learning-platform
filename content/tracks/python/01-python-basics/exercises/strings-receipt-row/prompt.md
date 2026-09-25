Write `receipt_row(name, quantity, unit_price)` that returns one line of a receipt, laid out in three
fixed-width columns so that rows line up underneath each other:

| Column | Width | Alignment | Shows |
|--------|-------|-----------|-------|
| name | 20 | left | the item name; names longer than 20 characters are cut to 20 |
| quantity | 4 | right | the quantity |
| line total | 10 | right | `quantity * unit_price`, with exactly 2 decimal places |

Every row is 34 characters long:

```python
receipt_row("Coffee beans", 2, 8.5)
# "Coffee beans           2     17.00"
```

The tests compare the string character for character.
