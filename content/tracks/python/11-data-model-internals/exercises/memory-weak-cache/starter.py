class RecordCache:
    """Share loaded records while someone is using them, without keeping them alive."""

    def __init__(self, loader):
        self._loader = loader
        self._records = {}

    def get(self, record_id):
        if record_id not in self._records:
            self._records[record_id] = self._loader(record_id)
        return self._records[record_id]

    def __len__(self):
        return len(self._records)
