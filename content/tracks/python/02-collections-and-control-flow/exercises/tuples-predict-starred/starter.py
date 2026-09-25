record = ("ORD-1042", "Ada", "mug", "tee", "cap")
order_id, customer, *items = record
print(order_id, customer)
print(items)

*_, last = items
print(last)

first, *middle, final = ["pack", "ship"]
print(middle)

a, b = 1, 2
a, b = b, a + b
print(a, b)
