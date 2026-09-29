import weakref

from plp import test, hidden
from solution import RecordCache


class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name


def database():
    """A fake loader, and the list of ids it was asked for."""
    calls = []

    def load_customer(customer_id):
        calls.append(customer_id)
        return Customer(customer_id, name=f"Customer {customer_id}")

    return load_customer, calls


@test("Shares a live record, and reloads it once it's gone")
def _():
    load_customer, calls = database()
    cache = RecordCache(load_customer)
    ada = cache.get("C-1")
    assert cache.get("C-1") is ada
    assert calls == ["C-1"]
    assert len(cache) == 1
    del ada
    assert len(cache) == 0
    cache.get("C-1")
    assert calls == ["C-1", "C-1"]


@test("An edit made through one reference is seen through the other")
def _():
    load_customer, _ = database()
    cache = RecordCache(load_customer)
    first = cache.get("C-7")
    first.name = "Grace Hopper"
    assert cache.get("C-7").name == "Grace Hopper"


@test("The cache doesn't keep records alive")
def _():
    load_customer, _ = database()
    cache = RecordCache(load_customer)
    record = cache.get("C-2")
    watcher = weakref.ref(record)
    del record
    assert watcher() is None, "Nothing outside the cache refers to the record, so it should have been freed"


@hidden("Tracks several records independently")
def _():
    load_customer, calls = database()
    cache = RecordCache(load_customer)
    ada, grace = cache.get("C-1"), cache.get("C-2")
    assert len(cache) == 2
    del grace
    assert len(cache) == 1
    assert cache.get("C-1") is ada
    assert cache.get("C-2").customer_id == "C-2"
    assert calls == ["C-1", "C-2", "C-2"]


@hidden("A record held elsewhere, in a list, stays cached")
def _():
    load_customer, calls = database()
    cache = RecordCache(load_customer)
    open_tabs = [cache.get("C-3")]
    shared = cache.get("C-3") is open_tabs[0]    # not compared inside assert, which would hold on to it
    assert shared, "A record that's still open elsewhere should come from the cache"
    open_tabs.clear()
    cache.get("C-3")
    assert calls == ["C-3", "C-3"]
