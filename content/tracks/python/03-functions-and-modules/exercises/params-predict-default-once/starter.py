discount = 10


def apply_discount(total, percent=discount):
    return total - total * percent / 100


discount = 50
print(apply_discount(200))
print(apply_discount(200, discount))


def remember(order_id, seen=[]):
    seen.append(order_id)
    return len(seen)


print(remember(101))
print(remember(102))
print(remember(103, []))
print(remember(104))
