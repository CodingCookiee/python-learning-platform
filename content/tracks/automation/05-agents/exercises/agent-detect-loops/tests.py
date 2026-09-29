from plp import hidden, test
from solution import LoopDetector

RATE = {"service": "checkout-api"}


@test("Flags the third identical call, as in the example")
def _():
    detector = LoopDetector()
    assert [detector.record("get_error_rate", RATE), detector.record("get_logs", RATE),
            detector.record("get_error_rate", RATE), detector.record("get_error_rate", RATE)] == [
        None, None, None, "get_error_rate was called 3 times with the same arguments"]


@test("Argument order doesn't make a call different")
def _():
    detector = LoopDetector()
    detector.record("get_error_rate", {"service": "checkout-api", "minutes": 15})
    detector.record("get_error_rate", {"minutes": 15, "service": "checkout-api"})
    assert detector.record("get_error_rate", {"service": "checkout-api", "minutes": 15}) == (
        "get_error_rate was called 3 times with the same arguments")


@test("Different arguments are different calls")
def _():
    detector = LoopDetector()
    for minutes in (5, 15, 60, 240):
        assert detector.record("get_error_rate", {"service": "checkout-api", "minutes": minutes}) is None
    assert detector.record("get_error_rate", {"service": "search-api"}) is None


@test("Only the last window calls count")
def _():
    detector = LoopDetector(max_repeats=2, window=3)
    results = [detector.record(name, RATE) for name in ["get_logs", "get_error_rate", "get_deploys", "get_logs"]]
    assert results == [None, None, None, None]
    assert detector.record("get_deploys", RATE) == "get_deploys was called 2 times with the same arguments"


@hidden("Nested arguments and higher counts")
def _():
    detector = LoopDetector(max_repeats=2)
    first = {"filters": {"level": "error", "services": ["checkout-api", "cart"]}, "limit": 20}
    again = {"limit": 20, "filters": {"services": ["checkout-api", "cart"], "level": "error"}}
    assert detector.record("search_logs", first) is None
    assert detector.record("search_logs", again) == "search_logs was called 2 times with the same arguments"
    assert detector.record("search_logs", first) == "search_logs was called 3 times with the same arguments"
    assert detector.record("search_logs", {**first, "limit": 50}) is None
