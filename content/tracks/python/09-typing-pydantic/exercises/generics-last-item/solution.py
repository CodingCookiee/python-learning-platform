from collections.abc import Sequence


def last[T](items: Sequence[T]) -> T:
    """The last item of a sequence. Raises IndexError("no items") when it's empty."""
    if not items:
        raise IndexError("no items")
    return items[-1]
