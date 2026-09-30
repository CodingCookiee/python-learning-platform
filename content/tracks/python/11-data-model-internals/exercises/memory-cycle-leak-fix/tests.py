import contextlib
import gc
import weakref

from plp import test, hidden
from solution import Order


@contextlib.contextmanager
def collector_off():
    """Run with the cycle collector disabled, as the nightly job does."""
    gc.collect()
    gc.disable()
    try:
        yield
    finally:
        gc.enable()
        gc.collect()


@test("An order is freed as soon as nothing uses it, with the collector off", timeout=10)
def _():
    with collector_off():
        order = Order("A1042")
        order.add_line("MUG-01", 2, 8.50)
        watcher = weakref.ref(order)
        del order
        assert watcher() is None, "The Order is still alive: something still refers back to it"


@test("Lines still know their order, and totals still work")
def _():
    order = Order("A1042")
    mug = order.add_line("MUG-01", 2, 8.50)
    order.add_line("TEA-50", 3, 4.20)
    assert mug.order is order
    assert mug.total == 17.0
    assert order.total() == 29.6
    assert [line.sku for line in order.lines] == ["MUG-01", "TEA-50"]


@test("A line kept on its own doesn't keep its order alive")
def _():
    with collector_off():
        order = Order("A1043")
        kept = order.add_line("LAMP-02", 1, 34.00)
        del order
        assert kept.order is None
        assert kept.total == 34.0


@hidden("Every line is freed along with its order")
def _():
    with collector_off():
        order = Order("A1044")
        watchers = [weakref.ref(order.add_line(f"SKU-{n}", 1, 1.0)) for n in range(5)]
        del order
        alive = [watcher() is not None for watcher in watchers]
        assert alive == [False] * 5


@hidden("Many orders in a loop don't pile up")
def _():
    with collector_off():
        watchers = []
        for n in range(200):
            order = Order(f"B{n}")
            order.add_line("MUG-01", 1, 8.5)
            watchers.append(weakref.ref(order))
        del order
        still_alive = sum(watcher() is not None for watcher in watchers)
        assert still_alive == 0
