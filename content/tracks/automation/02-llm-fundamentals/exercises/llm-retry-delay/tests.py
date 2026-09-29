from plp import hidden, test
from solution import retry_delay


@test("Backs off exponentially and honours retry_after, like the example")
def _():
    assert [retry_delay(attempt) for attempt in range(6)] == [1.0, 2.0, 4.0, 8.0, 16.0, 30.0]
    assert retry_delay(2, retry_after=12.0) == 12.0


@test("Uses the base and the cap you give it")
def _():
    assert [retry_delay(attempt, base=0.5, cap=3.0) for attempt in range(5)] == [0.5, 1.0, 2.0, 3.0, 3.0]


@test("retry_after wins, even when it's longer than the cap")
def _():
    assert retry_delay(0, retry_after=45.0) == 45.0


@hidden("A retry_after of 0 means retry now")
def _():
    assert retry_delay(3, retry_after=0) == 0
