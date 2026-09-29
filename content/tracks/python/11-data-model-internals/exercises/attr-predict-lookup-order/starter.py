class Account:
    fee = 5

    def __getattr__(self, name):
        print("getattr", name)
        return f"<no {name}>"

    def describe(self):
        return "account"


class Savings(Account):
    rate = 0.02


acct = Savings()
print(acct.fee, acct.rate)
print(acct.overdraft)

acct.fee = 1
print(acct.fee, Savings.fee)

acct.describe = lambda: "shadowed"
print(acct.describe(), Savings().describe())

del acct.fee
print(acct.fee)
print(hasattr(acct, "anything"))
print(sorted(vars(acct)))
