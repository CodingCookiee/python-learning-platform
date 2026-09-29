import re
from dataclasses import dataclass

NUMBER = re.compile(r"-?\d[\d,]*(?:\.\d+)?")


@dataclass(frozen=True)
class Score:
    passed: bool
    reason: str


OK = Score(True, "ok")


def normalise(text: str) -> str:
    """Fold case, collapse whitespace, and drop the ends' spaces and trailing . or !"""
    return re.sub(r"\s+", " ", text).strip().strip(".!").casefold()


def exact(output: str, expected: str) -> Score:
    """Equal after normalising."""
    if normalise(output) == normalise(expected):
        return OK
    return Score(False, f"expected {expected!r}, got {output!r}")


def contains(output: str, expected: str | list[str]) -> Score:
    """Every expected phrase (one string or a list) appears, after normalising."""
    phrases = [expected] if isinstance(expected, str) else expected
    text = normalise(output)
    missing = [phrase for phrase in phrases if normalise(phrase) not in text]
    if not missing:
        return OK
    return Score(False, f"missing {', '.join(repr(phrase) for phrase in missing)}")


def matches(output: str, pattern: str) -> Score:
    """The pattern is found somewhere in the output."""
    if re.search(pattern, output):
        return OK
    return Score(False, f"no match for {pattern!r}")


def within(output: str, expected: float, tolerance: float = 0.01) -> Score:
    """The first number in the output is within tolerance of expected."""
    match = NUMBER.search(output)
    if match is None:
        return Score(False, "no number in the output")
    value = float(match.group().replace(",", ""))
    if abs(value - expected) <= tolerance:
        return OK
    return Score(False, f"got {value}, expected {expected} ± {tolerance}")
