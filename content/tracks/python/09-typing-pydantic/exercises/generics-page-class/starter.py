from collections.abc import Callable, Iterable
from dataclasses import dataclass


@dataclass
class Page:
    """One page of results from a paginated API."""

    items: list
    next_cursor: str | None = None

    # has_more, first(), map(fn)


def collect_all(pages):
    """All the items from some pages, in order."""
    ...
