from plp import test, hidden
from solution import InMemoryOrders, Order, OrderService


class FakeNotifier:
    def __init__(self):
        self.messages = []

    def send(self, to, message):
        self.messages.append((to, message))


class ListRepository:
    """A different repository: the service shouldn't care which one it gets."""

    def __init__(self):
        self.saved = []

    def save(self, order):
        self.saved.append(order)


@test("Places, saves and confirms an order")
def _():
    orders = InMemoryOrders()
    notifier = FakeNotifier()
    service = OrderService(orders, notifier)
    order = service.place("ada@example.com", [("Coffee beans", 2, 12.5), ("Mug", 1, 8.0)])
    assert (order.order_id, order.total) == ("ORD-1", 33.0)
    assert orders.get("ORD-1") is order
    assert notifier.messages == [("ada@example.com", "Order ORD-1 confirmed: 33.00")]


@test("Numbers orders in sequence and keeps them oldest first")
def _():
    orders = InMemoryOrders()
    service = OrderService(orders, FakeNotifier())
    first = service.place("ada@example.com", [("Mug", 1, 8.0)])
    second = service.place("grace@example.com", [("Lamp", 1, 24.5)])
    assert (first.order_id, second.order_id) == ("ORD-1", "ORD-2")
    assert orders.all() == [first, second]


@test("Refuses an empty order without saving or sending")
def _():
    orders = InMemoryOrders()
    notifier = FakeNotifier()
    service = OrderService(orders, notifier)
    try:
        service.place("ada@example.com", [])
    except ValueError:
        assert orders.all() == []
        assert notifier.messages == []
        return
    raise AssertionError("place() with no lines should raise ValueError")


@test("Works with any repository that has save()")
def _():
    repository = ListRepository()
    service = OrderService(repository, FakeNotifier())
    order = service.place("linus@example.com", [("Filter papers", 3, 2.0)])
    assert repository.saved == [Order("ORD-1", "linus@example.com", [("Filter papers", 3, 2.0)])]
    assert order.total == 6.0


@hidden("Two services number their orders independently")
def _():
    first = OrderService(InMemoryOrders(), FakeNotifier())
    second = OrderService(InMemoryOrders(), FakeNotifier())
    first.place("ada@example.com", [("Mug", 1, 8.0)])
    assert second.place("grace@example.com", [("Mug", 1, 8.0)]).order_id == "ORD-1"


@hidden("Two repositories don't share orders")
def _():
    shop_a, shop_b = InMemoryOrders(), InMemoryOrders()
    OrderService(shop_a, FakeNotifier()).place("ada@example.com", [("Mug", 1, 8.0)])
    assert shop_b.all() == []


@hidden("A refused order doesn't use up an id")
def _():
    service = OrderService(InMemoryOrders(), FakeNotifier())
    try:
        service.place("ada@example.com", [])
    except ValueError:
        pass
    assert service.place("ada@example.com", [("Mug", 1, 8.0)]).order_id == "ORD-1"
