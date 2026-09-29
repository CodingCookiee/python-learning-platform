import weakref


class RecordCache:
    """Share loaded records while someone is using them, without keeping them alive."""

    def __init__(self, loader):
        self._loader = loader
        self._records = weakref.WeakValueDictionary()

    def get(self, record_id):
        record = self._records.get(record_id)
        if record is None:
            record = self._loader(record_id)
            self._records[record_id] = record
        return record

    def __len__(self):
        return len(self._records)
