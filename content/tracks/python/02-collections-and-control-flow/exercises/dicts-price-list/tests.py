from plp import test, hidden
from solution import price_list


def base():
    return {"MUG-01": 9.5, "TEE-02": 18.0, "CAP-03": 12.0}


def regional():
    return {"TEE-02": 16.5, "SCARF-04": 22.0}


@test("Applies regional prices and drops withdrawn SKUs")
def _():
    assert price_list(base(), regional(), ["CAP-03"]) == {"MUG-01": 9.5, "TEE-02": 16.5, "SCARF-04": 22.0}


@test("Keeps base order, with regional-only SKUs at the end")
def _():
    assert list(price_list(base(), regional(), [])) == ["MUG-01", "TEE-02", "CAP-03", "SCARF-04"]


@test("Leaves the base and regional price lists unchanged")
def _():
    shared_base, shared_regional = base(), regional()
    price_list(shared_base, shared_regional, ["CAP-03", "SCARF-04"])
    assert shared_base == base()
    assert shared_regional == regional()


@hidden("Ignores withdrawn SKUs that aren't listed anywhere")
def _():
    assert price_list(base(), {}, ["HAT-09"]) == base()


@hidden("Can withdraw a SKU that only the regional list adds")
def _():
    assert price_list(base(), regional(), ["SCARF-04"]) == {"MUG-01": 9.5, "TEE-02": 16.5, "CAP-03": 12.0}


@hidden("Returns a new dict even with nothing to change")
def _():
    shared_base = base()
    assert price_list(shared_base, {}, []) is not shared_base, "price_list should return a new dict, not base itself"
