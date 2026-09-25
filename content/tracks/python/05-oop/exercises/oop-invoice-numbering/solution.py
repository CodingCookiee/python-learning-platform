class Invoice:
    next_number = 1
    vat_rate = 0.2

    def __init__(self, customer, net):
        self.customer = customer
        self.net = net
        self.number = f"INV-{Invoice.next_number:04d}"
        Invoice.next_number += 1

    def gross(self):
        """Net plus VAT, rounded to 2 decimals."""
        return round(self.net * (1 + self.vat_rate), 2)
