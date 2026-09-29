class Transaction:
    """Post every entry added inside a with block to the ledger, or none of them."""

    def __init__(self, ledger):
        self.ledger = ledger
        self.pending = []
        self.committed = False
        self.open = False

    def add(self, entry):
        if not self.open:
            raise RuntimeError("transaction is not open")
        self.pending.append(entry)

    def __enter__(self):
        self.open = True
        return self

    def __exit__(self, exc_type, exc, tb):
        self.open = False
        if exc_type is None:
            self.ledger.extend(self.pending)
            self.committed = True
