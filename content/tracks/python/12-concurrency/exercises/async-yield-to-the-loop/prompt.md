The fraud service scores every new order with a quick CPU-only rule check, inside the same async
server that answers webhooks. A batch of 10,000 orders takes a fraction of a second to score, but
for that whole time the server answers nothing, and the payment provider's webhook calls time out.

Refactor `score_orders(orders, score, *, every=100)` so it lets the event loop run other tasks
after every `every` orders, with `await asyncio.sleep(0)`. It must still return
`[score(order) for order in orders]`, in order, and it shouldn't yield after every single order:
that would make the batch much slower for no benefit.

```python
await score_orders(todays_orders, fraud_score)       # 1,000 orders, other tasks run 10 times
```
