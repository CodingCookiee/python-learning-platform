import pickle

from plp import hidden, raises, test
from solution import parallel_map


def add_vat(price):
    return round(price * 1.2, 2)


class FakePool:
    """Behaves like ProcessPoolExecutor.map: every job and every result is pickled on the way."""

    def __init__(self):
        self.job_sizes = []

    def map(self, fn, *iterables):
        results = []
        for args in zip(*iterables):
            worker_fn, worker_args = pickle.loads(pickle.dumps((fn, args)))
            # how many items this job carries: the length of its chunk, or 1 for a single item
            self.job_sizes.append(max((len(arg) for arg in worker_args if isinstance(arg, (list, tuple))), default=1))
            results.append(pickle.loads(pickle.dumps(worker_fn(*worker_args))))
        return iter(results)


PRICES = [10.0, 5.6, 14.2, 2.35, 4.1, 21.0, 11.8, 8.0, 3.3, 7.25]


@test("Adds VAT to every price through a pool, four jobs of chunks")
def _():
    pool = FakePool()
    assert parallel_map(add_vat, PRICES, workers=4, map_fn=pool.map) == [add_vat(p) for p in PRICES]
    assert pool.job_sizes == [3, 3, 2, 2], f"the pool was sent jobs of sizes {pool.job_sizes}"


@test("Works with the built-in map too")
def _():
    assert parallel_map(add_vat, PRICES, workers=3) == [add_vat(p) for p in PRICES]


@test("A lambda is refused up front with TypeError")
def _():
    pool = FakePool()
    raises(TypeError, parallel_map, lambda price: price * 1.2, PRICES, workers=4, map_fn=pool.map, match="top-level")
    assert pool.job_sizes == [], "nothing should have been sent to the pool"


@hidden("A nested function is refused too")
def _():
    def local_vat(price):
        return price * 1.2

    raises(TypeError, parallel_map, local_vat, PRICES, workers=2, match="top-level")


@hidden("Any iterable, more workers than items, and no items")
def _():
    pool = FakePool()
    assert parallel_map(add_vat, (p for p in PRICES[:2]), workers=8, map_fn=pool.map) == [12.0, 6.72]
    assert pool.job_sizes == [1, 1]
    assert parallel_map(add_vat, [], workers=4, map_fn=FakePool().map) == []


@hidden("One worker sends one job")
def _():
    pool = FakePool()
    assert parallel_map(str.upper, ["eth-1kg", "mug-stn"], workers=1, map_fn=pool.map) == ["ETH-1KG", "MUG-STN"]
    assert pool.job_sizes == [2]
