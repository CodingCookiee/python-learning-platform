def discount(total):
    if total >= 100:
        return total * 0.9
    elif total >= 50:
        total * 0.95


def log_order(order_id):
    print("Logged", order_id)


print(discount(200))
print(discount(60))
print(discount(20))
result = log_order(1042)
print(result)
