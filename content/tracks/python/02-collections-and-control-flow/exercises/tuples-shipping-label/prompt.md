`shipping_label(order)` works, but it's hard to read: what is `order[2][1]`? An order record looks
like this:

```python
order = ("ORD-1042", "Ada Lovelace", ("12 Hill Street", "London", "N1 9GU"))
```

and the label it produces is:

```text
Ada Lovelace
12 Hill Street
London N1 9GU
Order ORD-1042
```

Rewrite the function so it **unpacks** the record into named pieces instead of indexing it. Its
output must stay exactly the same. The tests check that your code has no `[...]` indexing left.
