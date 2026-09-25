`top_three(prices)` should return the three highest prices, highest first, for a "premium picks"
banner:

```python
top_three([4.99, 24.5, 12.0, 8.75, 19.99])   # [24.5, 19.99, 12.0]
```

It crashes instead. Fix it, and make sure it doesn't reorder the caller's list: the shop page still
shows the products in their original order. If there are fewer than three prices, return them all.
