class CurrentAccount:
    def __init__(self, owner, opening_balance=0):
        self.owner = owner
        self.opening_balance = opening_balance
        self.balance = opening_balance
        self._transactions = []   # (memo, signed amount)

    def deposit(self, amount, memo):
        if amount <= 0:
            raise ValueError("Deposits must be positive")
        self._record(memo, amount)

    def withdraw(self, amount, memo):
        if amount <= 0:
            raise ValueError("Withdrawals must be positive")
        if amount > self.balance:
            raise ValueError(f"Insufficient funds: balance is {self.balance}")
        self._record(memo, -amount)

    def _record(self, memo, signed_amount):
        self._transactions.append((memo, signed_amount))
        self.balance += signed_amount

    def statement(self):
        """Return the statement: a header, an Opening line, one line per transaction, a Closing line."""
        lines = [
            f"Statement for {self.owner}",
            f"{'Opening':<12}{'':>11}{self.opening_balance:>11,.2f}",
        ]
        running = self.opening_balance
        for memo, amount in self._transactions:
            running += amount
            lines.append(f"{memo[:12]:<12}{amount:>+11,.2f}{running:>11,.2f}")
        lines.append(f"{'Closing':<12}{'':>11}{running:>11,.2f}")
        return "\n".join(lines)
