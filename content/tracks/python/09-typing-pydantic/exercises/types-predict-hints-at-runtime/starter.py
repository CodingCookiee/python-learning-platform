from typing import get_type_hints


def double(amount: int) -> int:
    return amount * 2


print(double(21))
print(double("21"))
print(double([5]))
print(double(1.5))
print(get_type_hints(double))
