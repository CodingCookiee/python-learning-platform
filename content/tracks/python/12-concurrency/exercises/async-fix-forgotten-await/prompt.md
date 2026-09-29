`basket_total(client, skus)` prices each SKU through the pricing API, records the quote in the
audit log, and returns the total. Both `client.price(sku)` and `client.audit(event, skus, total)`
are coroutine functions. It doesn't work:

```python
await basket_total(client, ["ETH-1KG", "MUG-STN"])
# TypeError: unsupported operand type(s) for +=: 'int' and 'coroutine'
```

Fix it, so that:

```python
await basket_total(client, ["ETH-1KG", "MUG-STN"])     # 19.8
client.audit_log     # [("quote", ["ETH-1KG", "MUG-STN"], 19.8)]
```
