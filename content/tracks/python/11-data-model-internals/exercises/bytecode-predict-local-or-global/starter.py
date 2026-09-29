discount = 5


def member_price(price):
    return price - discount


def sale_price(price):
    if price > 100:
        discount = 10
    return price - discount


def loyalty_price(price):
    global discount
    discount += 1
    return price - discount


print(member_price.__code__.co_varnames, member_price.__code__.co_names)
print(sale_price.__code__.co_varnames, sale_price.__code__.co_names)
print(loyalty_price.__code__.co_varnames, loyalty_price.__code__.co_names)

print(member_price(50), sale_price(150))
try:
    print(sale_price(50))
except UnboundLocalError:
    print("UnboundLocalError")

print(loyalty_price(50), loyalty_price(50), member_price(50), discount)
