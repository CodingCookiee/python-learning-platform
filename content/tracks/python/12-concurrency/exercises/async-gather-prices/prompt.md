`fetch_prices(client, skus)` asks the pricing API for each SKU and returns a dict of SKU to price.
It works, but it waits for each reply before sending the next request, so a basket of 30 items
takes 30 round trips. `await client.price(sku)` returns one price.

Make it send every request **at the same time**, and keep the result exactly the same, in the
order the SKUs were given:

```python
await fetch_prices(client, ["ETH-1KG", "MUG-STN", "V60-100"])
# {"ETH-1KG": 14.2, "MUG-STN": 5.6, "V60-100": 2.35}
```
