def discounted(price, percent):
    return round(price * (1 - percent / 100), 2)


def checkout_total(prices, percent):
    return round(sum(discounted(price, percent) for price in prices), 2)
