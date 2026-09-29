import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Score:
    passed: bool
    reason: str


def normalise(text):
    """Fold case, collapse whitespace, and drop the ends' spaces and trailing . or !"""
    return re.sub(r"\s+", " ", text).strip().strip(".!").casefold()


def exact(output, expected):
    """Equal after normalising."""
    return Score(output == expected, "ok")


def contains(output, expected):
    """Every expected phrase (one string or a list) appears, after normalising."""
    ...


def matches(output, pattern):
    """The pattern is found somewhere in the output."""
    ...


def within(output, expected, tolerance=0.01):
    """The first number in the output is within tolerance of expected."""
    ...
