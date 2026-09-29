class TableName:
    """A descriptor: the owning class's name, lower-cased, plus "s"."""

    def __get__(self, instance, owner):
        return owner.__name__.lower() + "s"
