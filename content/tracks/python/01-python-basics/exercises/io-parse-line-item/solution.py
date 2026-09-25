from decimal import Decimal


def parse_item(line):
    """Turn "Coffee beans, 2, 8.50" into ("Coffee beans", 2, Decimal("8.50"))."""
    name, quantity, unit_price = line.split(",")
    return name.strip(), int(quantity), Decimal(unit_price.strip())


if __name__ == "__main__":
    name, quantity, unit_price = parse_item(input("Item: "))
    print(f"{quantity} x {name} = {quantity * unit_price:.2f}")
