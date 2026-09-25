class Customer:
    def __init__(self, name, tier):
        self.name = name
        self.tier = tier

    def __repr__(self):
        return f"Customer({self.name!r}, {self.tier!r})"


class Invoice:
    def __init__(self, number, customer):
        self.number = number
        self.customer = customer

    def __repr__(self):
        return f"Invoice({self.number!r}, {self.customer!r})"

    def __str__(self):
        return f"Invoice {self.number} for {self.customer.name}"


ada = Customer("Ada", "gold")
invoice = Invoice("INV-0007", ada)

print(ada)
print(invoice)
print([invoice])
print(f"{invoice.customer} | {invoice!r}")
