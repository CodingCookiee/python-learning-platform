import inspect

from plp import test, hidden
from solution import average_latency


@test("Returns the running average after each reading")
def _():
    monitor = average_latency()
    assert next(monitor) is None
    assert monitor.send(120) == 120.0
    assert monitor.send(80) == 100.0
    assert monitor.send(310) == 170.0


@test("Is a generator function")
def _():
    assert inspect.isgeneratorfunction(average_latency), "average_latency should use yield"


@test("A window averages only the latest readings")
def _():
    monitor = average_latency(window=2)
    next(monitor)
    assert monitor.send(100) == 100.0
    assert monitor.send(200) == 150.0
    assert monitor.send(600) == 400.0
    assert monitor.send(0) == 300.0


@hidden("Rounds to one decimal place")
def _():
    monitor = average_latency()
    next(monitor)
    monitor.send(10)
    monitor.send(10)
    assert monitor.send(11) == 10.3


@hidden("Two monitors keep separate readings")
def _():
    first, second = average_latency(), average_latency()
    next(first)
    next(second)
    first.send(1000)
    assert second.send(50) == 50.0


@hidden("Keeps going for thousands of readings, and closes cleanly")
def _():
    monitor = average_latency(window=10)
    next(monitor)
    for ms in range(5000):
        average = monitor.send(ms)
    assert average == 4994.5
    monitor.close()
    assert inspect.getgeneratorstate(monitor) == "GEN_CLOSED"
