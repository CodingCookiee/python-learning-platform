class DiscountCalculator:
    def __init__(self, percent):
        self.percent = percent

    def apply(self, price):
        return round(price * (1 - self.percent / 100), 2)


def checkout_total(prices, percent):
    calculator = DiscountCalculator(percent)
    return round(sum(calculator.apply(price) for price in prices), 2)
