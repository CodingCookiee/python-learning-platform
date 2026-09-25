import json

order = {"id": 1042, "items": ("mug", "tea"), "paid": True, "coupon": None, 7: "gift wrap"}
text = json.dumps(order)
print(text)

back = json.loads(text)
print(back["items"], back["7"])
print(back == order)
print(json.loads('[1, 2.0, "3", false]'))
