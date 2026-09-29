class Sku:
    comparisons = 0

    def __init__(self, code):
        self.code = code

    def __eq__(self, other):
        Sku.comparisons += 1
        return self.code == other.code

    def __hash__(self):
        return hash(self.code)


catalogue = [Sku(f"MUG-{n:02d}") for n in range(1, 11)]
in_stock = set(catalogue)


def search(check):
    Sku.comparisons = 0
    found = check()
    return found, Sku.comparisons


print(search(lambda: Sku("MUG-07") in catalogue))
print(search(lambda: Sku("TEA-01") in catalogue))
print(search(lambda: Sku("MUG-07") in in_stock))
print(search(lambda: Sku("TEA-01") in in_stock))
