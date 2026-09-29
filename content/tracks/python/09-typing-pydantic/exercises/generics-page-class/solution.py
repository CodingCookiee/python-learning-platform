from collections.abc import Callable, Iterable
from dataclasses import dataclass


@dataclass
class Page[T]:
    """One page of results from a paginated API."""

    items: list[T]
    next_cursor: str | None = None

    @property
    def has_more(self) -> bool:
        return self.next_cursor is not None

    def first(self) -> T | None:
        return self.items[0] if self.items else None

    def map[U](self, fn: Callable[[T], U]) -> Page[U]:
        return Page([fn(item) for item in self.items], self.next_cursor)


def collect_all[T](pages: Iterable[Page[T]]) -> list[T]:
    items: list[T] = []
    for page in pages:
        items.extend(page.items)
    return items
