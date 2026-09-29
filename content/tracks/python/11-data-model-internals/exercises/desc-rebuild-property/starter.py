class Property:
    """A pure-Python property: a data descriptor built from a getter, setter and deleter."""

    def __init__(self, fget=None, fset=None, fdel=None):
        self.fget = fget
        self.fset = fset
        self.fdel = fdel
