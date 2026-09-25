An order confirmation shows which card was charged without revealing the number. Write
`mask_card(number)` that returns the card's digits with every digit except the last four replaced by
`*`. Card numbers arrive with spaces or dashes between groups; leave those out of the result.

```python
mask_card("4111-1111-1111-1234")    # "************1234"
mask_card("4242 4242 4242 4242")    # "************4242"
```

Cards don't all have 16 digits, so don't assume they do.
