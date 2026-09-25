class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        """Add amount and return the new balance. ValueError if amount <= 0."""
        if amount <= 0:
            raise ValueError("Deposits must be positive")
        self.balance += amount
        return self.balance

    def withdraw(self, amount):
        """Take amount and return the new balance. ValueError if amount <= 0 or > balance."""
        if amount <= 0:
            raise ValueError("Withdrawals must be positive")
        if amount > self.balance:
            raise ValueError(f"Insufficient funds: balance is {self.balance}")
        self.balance -= amount
        return self.balance

    def transfer_to(self, other, amount):
        """Move amount from this account into other."""
        self.withdraw(amount)
        other.deposit(amount)
