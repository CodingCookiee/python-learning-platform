from collections.abc import Sequence


class PagedResults(Sequence):
    """A read-only sequence over a paged API, fetching each page only when it's needed."""

    def __init__(self, fetch_page, page_size):
        self._fetch_page = fetch_page
        self._page_size = page_size
        self._pages = {}
        self._total = None

    def _page(self, number):
        if number not in self._pages:
            items, total = self._fetch_page(number)
            self._pages[number] = list(items)
            self._total = total
        return self._pages[number]

    def __len__(self):
        if self._total is None:
            self._page(0)
        return self._total

    def __getitem__(self, index):
        if isinstance(index, slice):
            return [self[position] for position in range(*index.indices(len(self)))]
        if index < 0:
            index += len(self)
        if index < 0 or (self._total is not None and index >= self._total):
            raise IndexError("result index out of range")
        page, offset = divmod(index, self._page_size)
        items = self._page(page)
        if offset >= len(items):
            raise IndexError("result index out of range")
        return items[offset]
