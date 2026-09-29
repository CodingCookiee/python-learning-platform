from plp import hidden, raises, test
from solution import CircuitBreaker, CircuitOpen


class Clock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


def overloaded():
    raise RuntimeError("529 overloaded")


def answered():
    return "Refunds take 14 days."


def breaker_opened_at_2s():
    """Three failures at 0, 1 and 2 seconds: the breaker opens at 2 s."""
    clock = Clock()
    breaker = CircuitBreaker(failure_threshold=3, cooldown=30, clock=clock)
    for t in (0, 1, 2):
        clock.now = t
        raises(RuntimeError, breaker.call, overloaded)
    return breaker, clock


@test("Lets a trial through 30 s after opening, despite refused calls in between")
def _():
    breaker, clock = breaker_opened_at_2s()
    assert breaker.state == "open"
    for t in (10, 20, 30):
        clock.now = t
        raises(CircuitOpen, breaker.call, answered)
    clock.now = 32
    assert breaker.call(answered) == "Refunds take 14 days."
    assert breaker.state == "closed"


@test("Refused calls never reach the provider")
def _():
    breaker, clock = breaker_opened_at_2s()
    calls = []
    clock.now = 15
    raises(CircuitOpen, breaker.call, lambda: calls.append("called"))
    assert calls == []


@test("A failed trial opens it again, counting the cool-down from the trial")
def _():
    breaker, clock = breaker_opened_at_2s()
    clock.now = 40
    raises(RuntimeError, breaker.call, overloaded)
    assert breaker.state == "open"
    clock.now = 60
    raises(CircuitOpen, breaker.call, answered)
    clock.now = 70
    assert breaker.call(answered) == "Refunds take 14 days."


@test("After closing, it takes the full threshold of failures to open again")
def _():
    breaker, clock = breaker_opened_at_2s()
    clock.now = 35
    breaker.call(answered)
    clock.now = 36
    raises(RuntimeError, breaker.call, overloaded)
    assert breaker.state == "closed"
    raises(RuntimeError, breaker.call, overloaded)
    assert breaker.state == "closed"
    raises(RuntimeError, breaker.call, overloaded)
    assert breaker.state == "open"


@hidden("Steady traffic through a long outage still gets a trial every cool-down")
def _():
    breaker, clock = breaker_opened_at_2s()
    trials = []
    for t in range(3, 200):
        clock.now = t
        try:
            breaker.call(lambda: trials.append(clock.now) or overloaded())
        except CircuitOpen:
            pass
        except RuntimeError:
            pass
    assert trials == [32, 62, 92, 122, 152, 182]


@hidden("A success while closed resets the count of consecutive failures")
def _():
    clock = Clock()
    breaker = CircuitBreaker(failure_threshold=3, cooldown=30, clock=clock)
    for fn in (overloaded, overloaded, answered, overloaded, overloaded):
        try:
            breaker.call(fn)
        except (RuntimeError, CircuitOpen):
            pass
    assert breaker.state == "closed"
