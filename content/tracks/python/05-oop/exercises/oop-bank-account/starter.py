class BankAccount:
    def __init__(self, owner, balance=0):
        ...

    def deposit(self, amount):
        """Add amount and return the new balance. ValueError if amount <= 0."""
        ...

    def withdraw(self, amount):
        """Take amount and return the new balance. ValueError if amount <= 0 or > balance."""
        ...

    def transfer_to(self, other, amount):
        """Move amount from this account into other."""
        ...
