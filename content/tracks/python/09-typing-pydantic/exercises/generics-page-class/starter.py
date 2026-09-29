from collections.abc import Callable, Iterable
from dataclasses import dataclass


@dataclass
class Page:
    """One page of results from a paginated API."""

    items: list
    next_cursor: str | None = None

    # has_more, first(), map(fn)


# collect_all(pages)
