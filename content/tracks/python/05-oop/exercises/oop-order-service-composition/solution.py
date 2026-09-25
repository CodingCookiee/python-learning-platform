from dataclasses import dataclass


@dataclass
class Order:
    order_id: str
    customer_email: str
    lines: list   # [(product, quantity, unit_price), ...]

    @property
    def total(self):
        return sum(quantity * price for _, quantity, price in self.lines)


class InMemoryOrders:
    def __init__(self):
        self._orders = {}

    def save(self, order):
        self._orders[order.order_id] = order

    def get(self, order_id):
        return self._orders[order_id]

    def all(self):
        return list(self._orders.values())


class OrderService:
    def __init__(self, repository, notifier):
        self.repository = repository
        self.notifier = notifier
        self._next_id = 1

    def place(self, customer_email, lines):
        if not lines:
            raise ValueError("An order needs at least one line")
        order = Order(f"ORD-{self._next_id}", customer_email, list(lines))
        self._next_id += 1
        self.repository.save(order)
        self.notifier.send(customer_email, f"Order {order.order_id} confirmed: {order.total:.2f}")
        return order
