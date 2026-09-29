from plp import test, hidden
from solution import checkout_zones, shipping_zones

GB = ["mainland", "highlands", "islands"]


@test("Offers the same zones on every checkout")
def _():
    shipping_zones.cache_clear()
    assert checkout_zones("GB", express_available=True) == [*GB, "express"]
    assert checkout_zones("GB", express_available=True) == [*GB, "express"]
    assert checkout_zones("GB", express_available=False) == GB


@test("shipping_zones returns a tuple")
def _():
    shipping_zones.cache_clear()
    assert shipping_zones("DE") == ("north", "south")


@test("shipping_zones is still cached")
def _():
    shipping_zones.cache_clear()
    checkout_zones("FR", express_available=True)
    checkout_zones("FR", express_available=False)
    checkout_zones("FR", express_available=True)
    info = shipping_zones.cache_info()
    assert (info.hits, info.misses) == (2, 1), f"Expected 2 hits and 1 miss for three FR checkouts, got {info.hits} and {info.misses}"


@hidden("Each checkout gets a list of its own")
def _():
    shipping_zones.cache_clear()
    first = checkout_zones("DE", express_available=False)
    first.append("click and collect")
    assert checkout_zones("DE", express_available=False) == ["north", "south"]
    assert isinstance(first, list)


@hidden("An unknown country has no zones but can still offer express")
def _():
    shipping_zones.cache_clear()
    assert shipping_zones("US") == ()
    assert checkout_zones("US", express_available=True) == ["express"]
    assert checkout_zones("US", express_available=True) == ["express"]
