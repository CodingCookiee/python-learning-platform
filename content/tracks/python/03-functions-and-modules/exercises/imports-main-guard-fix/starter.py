def to_pence(price_text):
    """Turn a price like "£12.50" or "3.99" into a whole number of pence."""
    return round(float(price_text.strip().removeprefix("£")) * 100)


def total_pence(price_texts):
    """Return the total of several prices, in pence."""
    return sum(to_pence(text) for text in price_texts)


prices = []
while True:
    line = input("Price (blank to finish): ")
    if not line:
        break
    prices.append(line)
print(f"Total: {total_pence(prices)}p")
