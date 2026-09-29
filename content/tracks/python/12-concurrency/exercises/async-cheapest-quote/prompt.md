At checkout the shop asks several couriers for a shipping quote and offers the cheapest. Some
couriers are slow and some are down, and the customer shouldn't wait for them. Write
`cheapest_quote(providers, parcel, *, seconds)`:

- Each provider has a `name` and a coroutine method `quote(parcel)` that returns a price.
- Ask every provider **at the same time**, giving each one at most `seconds` to answer. A provider
  that's too slow, or whose `quote` raises an exception, is left out.
- Return `(name, price)` for the cheapest quote. If two quotes are equal, the provider listed
  first wins.
- If nobody answered in time, raise `LookupError("no shipping quotes")`.

```python
await cheapest_quote([parcelnet, swiftpost, royal_express], parcel, seconds=0.1)
# ("swiftpost", 4.2)
```

Here `royal_express` would have quoted 3.99, but it takes a full second to answer, so it's left
out, and the whole call takes no more than about 0.1 seconds.
