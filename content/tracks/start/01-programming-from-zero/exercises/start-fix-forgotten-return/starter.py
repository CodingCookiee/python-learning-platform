def ticket_price(age):
    if age < 12:
        price = 6
    else:
        price = 10


total = 0
for age in [8, 35, 41]:
    total += ticket_price(age)

print("Total:", total)
