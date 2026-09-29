from decimal import Decimal

minutes_in_month = 30 * 24 * 60

for target in ["99", "99.5", "99.9"]:
    allowed = minutes_in_month * (100 - Decimal(target)) / 100
    print(f"{target}%: {allowed.quantize(Decimal('0.1'))} minutes down a month")

provider = Decimal("0.995")    # EXAMPLE: the AI provider's availability
server = Decimal("0.999")      # EXAMPLE: your server's availability
both = provider * server * 100
print(f"both up: {both.quantize(Decimal('0.01'))}%")
