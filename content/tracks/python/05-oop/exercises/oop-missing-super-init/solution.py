class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance
        self.history = []

    def deposit(self, amount):
        self.balance += amount
        self.history.append(("deposit", amount))


class SavingsAccount(BankAccount):
    BONUS_THRESHOLD = 1000
    BONUS = 5

    def __init__(self, owner, rate, balance=0):
        super().__init__(owner, balance)
        self.rate = rate

    def deposit(self, amount):
        if amount > self.BONUS_THRESHOLD:
            amount += self.BONUS
        super().deposit(amount)

    def add_interest(self):
        self.balance = round(self.balance * (1 + self.rate), 2)
