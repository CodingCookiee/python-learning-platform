defaults = {"currency": "GBP", "tax": 0.2, "shipping": 4.99}
customer = {"shipping": 0, "gift_wrap": True}

settings = defaults | customer
print(settings)
print(list(settings))
print(defaults["shipping"])

defaults |= {"tax": 0.0}
print(defaults)

print(settings.get("coupon"), settings.get("coupon", "none"))
print({"mug": 1, "tee": 2} == {"tee": 2, "mug": 1})
