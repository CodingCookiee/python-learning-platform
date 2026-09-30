from plp import hidden, test
from solution import ErrorRateMonitor

# A busy day, built once and untimed: one request every 0.5 s, every 25th one failing
BUSY = [(n % 25 != 0, n * 0.5) for n in range(40_000)]


@test("Alerts on the example, and stops once it has all expired")
def _():
    monitor = ErrorRateMonitor(window_seconds=300, min_requests=20, threshold=0.05)
    for second in range(100):
        monitor.record(ok=second % 10 != 0, now=second)
    assert (monitor.error_rate(now=99), monitor.should_alert(now=99)) == (0.1, True)
    assert monitor.should_alert(now=400) is False
    assert monitor.requests(now=400) == 0


@test("Only the last window_seconds count")
def _():
    monitor = ErrorRateMonitor(window_seconds=60)
    for second in range(0, 30):
        monitor.record(ok=False, now=second)       # a bad half-minute
    for second in range(30, 120):
        monitor.record(ok=True, now=second)
    assert monitor.requests(now=119) == 60
    assert monitor.error_rate(now=119) == 0.0


@test("Too few requests never alert, however many fail")
def _():
    monitor = ErrorRateMonitor(min_requests=20)
    monitor.record(ok=False, now=10_800)
    monitor.record(ok=False, now=10_801)
    monitor.record(ok=True, now=10_802)
    assert monitor.error_rate(now=10_802) == 2 / 3
    assert monitor.should_alert(now=10_802) is False


@test("The threshold itself doesn't alert; just above it does")
def _():
    monitor = ErrorRateMonitor(min_requests=20, threshold=0.05)
    for n in range(20):
        monitor.record(ok=n != 0, now=n)
    assert monitor.error_rate(now=19) == 0.05
    assert monitor.should_alert(now=19) is False
    monitor.record(ok=False, now=20)
    assert monitor.should_alert(now=20) is True


@hidden("Keeps up with 40,000 requests", timeout=5)
def _():
    monitor = ErrorRateMonitor(window_seconds=300, min_requests=20, threshold=0.05)
    for ok, now in BUSY:
        monitor.record(ok, now)
        if now % 60 == 0:
            monitor.should_alert(now)
    assert monitor.requests(now=BUSY[-1][1]) == 600
    assert monitor.error_rate(now=BUSY[-1][1]) == 24 / 600
    assert monitor.error_rate(now=10**9) == 0.0
