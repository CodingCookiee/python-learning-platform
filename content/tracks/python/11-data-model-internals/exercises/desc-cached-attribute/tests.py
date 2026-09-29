from plp import test, hidden, source_avoids
from solution import cached_attribute


class Report:
    def __init__(self, orders):
        self.orders = orders
        self.computed = 0

    @cached_attribute
    def totals(self):
        self.computed += 1
        return sum(amount for _, amount in self.orders)

    @cached_attribute
    def largest(self):
        self.computed += 1
        return max(self.orders, key=lambda order: order[1])[0]


def sample():
    return Report([("ORD-1", 40), ("ORD-2", 25)])


@test("Computes on first read and stores the value on the instance")
def _():
    report = sample()
    assert (report.totals, report.totals) == (65, 65)
    assert report.computed == 1
    assert vars(report)["totals"] == 65


@test("del throws the cached value away")
def _():
    report = sample()
    assert report.totals == 65
    report.orders.append(("ORD-3", 10))
    assert report.totals == 65
    del report.totals
    assert report.totals == 75
    assert report.computed == 2


@test("Read on the class, it's the descriptor")
def _():
    assert isinstance(Report.totals, cached_attribute)
    assert not hasattr(cached_attribute, "__set__"), (
        "With __set__ it would be a data descriptor, and every read would go through it"
    )


@hidden("Each attribute and each instance has its own cache")
def _():
    first, second = sample(), Report([("ORD-9", 5)])
    assert (first.totals, first.largest) == (65, "ORD-1")
    assert (second.totals, second.largest) == (5, "ORD-9")
    assert first.computed == 2 and second.computed == 2
    assert sorted(name for name in vars(first) if name in ("totals", "largest")) == ["largest", "totals"]


@hidden("Assigning replaces the cached value, and it isn't functools")
def _():
    report = sample()
    report.totals = 1000
    assert report.totals == 1000
    assert report.computed == 0
    assert source_avoids(name="cached_property")
