class Plan:
    price = 10


basic = Plan()
pro = Plan()

pro.price = 25
Plan.price = 12
print(basic.price, pro.price, Plan.price)

del pro.price
print(pro.price)

basic.price += 1
print(basic.price, Plan.price)
print("price" in vars(basic), "price" in vars(pro))
