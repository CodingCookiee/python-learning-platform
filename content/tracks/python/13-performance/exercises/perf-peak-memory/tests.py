import tracemalloc

from plp import test, hidden, raises
from solution import peak_kib


def spike():
    """Needs about 1 MB for a moment, then returns something tiny."""
    buffer = bytearray(1_000_000)
    return len(buffer)


def corrupt_export():
    buffer = bytearray(10_000)
    raise ValueError(f"row {len(buffer)} is malformed")


@test("Returns the result and the peak in KiB")
def _():
    data, peak = peak_kib(bytearray, 500_000)
    assert len(data) == 500_000
    assert 488 < peak < 520, f"peak was {peak} KiB; half a million bytes is about 488.3 KiB"


@test("Measures the peak, not what's left at the end")
def _():
    result, peak = peak_kib(spike)
    assert result == 1_000_000
    assert 976 < peak < 1_010, f"peak was {peak} KiB, but spike() needed about 977 KiB at its worst"


@test("Switches tracing off afterwards")
def _():
    peak_kib(sorted, [3, 1, 2])
    assert tracemalloc.is_tracing() is False, "tracemalloc is still running after peak_kib returned"


@test("Rounds to one decimal place")
def _():
    _, peak = peak_kib(bytearray, 100_000)
    assert peak == round(peak, 1)
    assert isinstance(peak, float)


@hidden("Switches tracing off even when fn raises")
def _():
    raises(ValueError, peak_kib, corrupt_export)
    assert tracemalloc.is_tracing() is False, "tracemalloc is still running after fn raised"


@hidden("Passes every argument through")
def _():
    result, _ = peak_kib(max, 4, 11, 7)
    assert result == 11
