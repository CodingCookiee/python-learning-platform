Build an order service out of swappable parts, so it can be tested without a database or an email
server. The `Order` dataclass is written for you.

`InMemoryOrders` stores orders:

- `save(order)` stores an order, `get(order_id)` returns it, and `all()` returns every saved order,
  oldest first.

`OrderService(repository, notifier)` places orders using whatever repository and notifier it's
given. The repository is any object with `save(order)`; the notifier is any object with
`send(to, message)`.

- `place(customer_email, lines)` creates an `Order` with the next id for this service (`"ORD-1"`,
  then `"ORD-2"`, and so on), saves it, sends the customer
  `"Order ORD-1 confirmed: 33.00"` (the total with two decimals), and returns the order.
- Placing an order with no lines raises `ValueError`, and nothing is saved or sent.

```python
class PrintNotifier:
    def send(self, to, message):
        print(to, message)

orders = InMemoryOrders()
service = OrderService(orders, PrintNotifier())
order = service.place("ada@example.com", [("Coffee beans", 2, 12.5), ("Mug", 1, 8.0)])
# prints: ada@example.com Order ORD-1 confirmed: 33.00
order.order_id, order.total    # ("ORD-1", 33.0)
orders.get("ORD-1") is order   # True
```
