from decimal import Decimal


class Invoice:
    pass


draft = Invoice()

print(type(draft).__name__, type(Invoice).__name__, type(type).__name__)
print(isinstance(draft, object), isinstance(Invoice, object), isinstance(Invoice, type))
print(isinstance(draft, type), issubclass(Invoice, object))
print(isinstance(True, int), type(True) is int)
print(type(Decimal("1.50")) is Decimal, type(Decimal) is type)
print(issubclass(type, object), isinstance(object, type))
