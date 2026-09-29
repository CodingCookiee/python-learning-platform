class Property:
    """A pure-Python property: a data descriptor built from a getter, setter and deleter."""

    def __init__(self, fget=None, fset=None, fdel=None):
        self.fget = fget
        self.fset = fset
        self.fdel = fdel
        self.name = getattr(fget, "__name__", "attribute")
        self.__doc__ = getattr(fget, "__doc__", None)

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        if self.fget is None:
            raise AttributeError(f"{self.name} has no getter")
        return self.fget(instance)

    def __set__(self, instance, value):
        if self.fset is None:
            raise AttributeError(f"{self.name} has no setter")
        self.fset(instance, value)

    def __delete__(self, instance):
        if self.fdel is None:
            raise AttributeError(f"{self.name} has no deleter")
        self.fdel(instance)

    def _copy(self, fget, fset, fdel):
        new = type(self)(fget, fset, fdel)
        new.name = self.name
        new.__doc__ = self.__doc__
        return new

    def getter(self, fget):
        return self._copy(fget, self.fset, self.fdel)

    def setter(self, fset):
        return self._copy(self.fget, fset, self.fdel)

    def deleter(self, fdel):
        return self._copy(self.fget, self.fset, fdel)
