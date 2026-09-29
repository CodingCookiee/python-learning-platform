from plp import hidden, test
from solution import classify


@test("Classifies the invoice export and the thumbnail job")
def _():
    assert classify(0.8, 12.0) == "io-bound"
    assert classify(4.9, 5.0) == "cpu-bound"


@test("Something in between is mixed")
def _():
    assert classify(3.0, 6.0) == "mixed"


@test("A job that never touched the CPU is I/O-bound")
def _():
    assert classify(0.0, 2.5) == "io-bound"


@hidden("The boundaries belong to cpu-bound and io-bound")
def _():
    assert classify(8.0, 10.0) == "cpu-bound"
    assert classify(2.0, 10.0) == "io-bound"
    assert classify(2.1, 10.0) == "mixed"
    assert classify(7.9, 10.0) == "mixed"
