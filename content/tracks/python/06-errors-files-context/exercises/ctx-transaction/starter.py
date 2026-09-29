class Transaction:
    """Post every entry added inside a with block to the ledger, or none of them."""

    def __init__(self, ledger):
        self.ledger = ledger
        self.pending = []
        self.committed = False
        self.open = False

    def add(self, entry):
        self.pending.append(entry)

    # __enter__ and __exit__
