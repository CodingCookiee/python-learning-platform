class PositiveNumber:
    """A field that only accepts an int or float above zero."""

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__[self.name]

    def __set__(self, instance, value):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
            raise ValueError(f"{self.name} must be a positive number, got {value!r}")
        instance.__dict__[self.name] = value


class Shipment:
    weight_kg = PositiveNumber()
    length_cm = PositiveNumber()
    declared_value = PositiveNumber()

    def __init__(self, reference, weight_kg, length_cm, declared_value):
        self.reference = reference
        self.weight_kg = weight_kg
        self.length_cm = length_cm
        self.declared_value = declared_value
