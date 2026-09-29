import gc

gc.disable()


class Basket:
    def __init__(self, owner):
        self.owner = owner
        print("open", owner)

    def __del__(self):
        print("freed", self.owner)


def checkout():
    basket = Basket("ada")
    print("paying")


checkout()
print("after checkout")

first = Basket("grace")
second = first
del first
print("first deleted")
second = None
print("second rebound")

loop = Basket("linus")
loop.saved_for_later = loop
del loop
print("loop deleted")
gc.collect()
print("collected")

gc.enable()
