def _check_positive(name, value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value <= 0:
        raise ValueError(f"{name} must be a positive number, got {value!r}")
    return value


class Shipment:
    def __init__(self, reference, weight_kg, length_cm, declared_value):
        self.reference = reference
        self.weight_kg = weight_kg
        self.length_cm = length_cm
        self.declared_value = declared_value

    @property
    def weight_kg(self):
        return self._weight_kg

    @weight_kg.setter
    def weight_kg(self, value):
        self._weight_kg = _check_positive("weight_kg", value)

    @property
    def length_cm(self):
        return self._length_cm

    @length_cm.setter
    def length_cm(self, value):
        self._length_cm = _check_positive("length_cm", value)

    @property
    def declared_value(self):
        return self._declared_value

    @declared_value.setter
    def declared_value(self, value):
        self._declared_value = _check_positive("declared_value", value)
