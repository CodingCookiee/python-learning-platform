def describe(value):
    match value:
        case 0:
            return "zero"
        case int(n) if n < 0:
            return f"negative {n}"
        case int() | float():
            return "number"
        case [item]:
            return f"one item: {item}"
        case [first, *rest]:
            return f"{first} and {len(rest)} more"
        case {"sku": sku}:
            return f"product {sku}"
        case str():
            return "text"
        case _:
            return "something else"


print(describe(0))
print(describe(-4))
print(describe(2.5))
print(describe(["mug"]))
print(describe(["mug", "tee", "cap"]))
print(describe({"sku": "CAP-03", "qty": 2}))
print(describe("mug"))
print(describe([]))
print(describe(True))
