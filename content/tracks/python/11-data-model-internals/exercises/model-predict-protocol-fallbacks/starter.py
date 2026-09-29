class Shelf:
    def __init__(self, items):
        self.items = items

    def __getitem__(self, index):
        print("getitem", index)
        return self.items[index]


shelf = Shelf(["mug", "lamp"])
print("lamp" in shelf)
print(list(shelf))


class Basket:
    def __init__(self, items):
        self.items = items

    def __len__(self):
        print("len")
        return len(self.items)

    def __iter__(self):
        print("iter")
        return iter(self.items)


basket = Basket([])
print(bool(basket))
print("mug" in basket)
basket.__len__ = lambda: 5
print(len(basket))


class Voucher:
    def __init__(self, value):
        self.value = value

    def __len__(self):
        return 3

    def __bool__(self):
        return self.value > 0


print(bool(Voucher(0)), len(Voucher(0)))
