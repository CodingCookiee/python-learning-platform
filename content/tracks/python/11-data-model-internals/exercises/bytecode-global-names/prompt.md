Before moving a function into another module, you want to know every global name it depends on:
module constants, other functions, and built-ins. The bytecode already knows. Write
`global_names(func)` that returns the sorted, distinct names `func` looks up as globals (the
`LOAD_GLOBAL` instructions), **including** those in any lambdas and functions nested inside it.

Local variables, parameters and attribute names (the `total` in `order.total`) aren't globals and
don't count.

```python
VAT = 0.2

def invoice_total(lines):
    subtotal = sum(line.total for line in lines)
    fee = lambda amount: max(amount * FEE_RATE, MINIMUM_FEE)
    return round(subtotal * (1 + VAT) + fee(subtotal), 2)

global_names(invoice_total)
# ['FEE_RATE', 'MINIMUM_FEE', 'VAT', 'max', 'round', 'sum']
```

The names don't have to exist yet: `FEE_RATE` is reported even though it's never defined.
