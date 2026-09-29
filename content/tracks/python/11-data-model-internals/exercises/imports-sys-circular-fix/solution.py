import customers


class Order:
    def __init__(self, customer, total):
        if not isinstance(customer, customers.Customer):
            raise TypeError("an order needs a Customer")
        self.customer = customer
        self.total = total

    def __repr__(self):
        return f"Order({self.customer.name!r}, {self.total})"


def total_spent(customer):
    """The total of every order a customer has placed."""
    return sum(order.total for order in customer.orders)
