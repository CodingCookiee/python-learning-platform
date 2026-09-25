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
    def save(self, order):
        ...

    def get(self, order_id):
        ...

    def all(self):
        ...


class OrderService:
    def __init__(self, repository, notifier):
        ...

    def place(self, customer_email, lines):
        ...
