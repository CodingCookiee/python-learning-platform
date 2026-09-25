region = "EU"
tax = 0.2


def invoice(amount):
    tax = 0.1

    def line():
        return f"{region} {amount} tax={tax}"

    return line()


def change_region():
    region = "US"
    return region


print(invoice(50))
print(change_region())
print(region)

for day in ["mon", "tue"]:
    last_day = day
print(day, last_day)

print(tax)
