class Step:
    def __init__(self, name, suppress=False):
        self.name = name
        self.suppress = suppress

    def __enter__(self):
        print("enter", self.name)
        return self.name.upper()

    def __exit__(self, exc_type, exc, tb):
        print("exit", self.name, exc_type.__name__ if exc_type else None)
        return self.suppress


with Step("import", suppress=True) as outer, Step("stock") as inner:
    print("inside", outer, inner)
    raise KeyError("MUG-01")
    print("never printed")
print("after the block")

with Step("report"):
    print("all good")
