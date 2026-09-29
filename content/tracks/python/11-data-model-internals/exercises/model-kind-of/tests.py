import json
import math
from decimal import Decimal

from plp import test, hidden
from solution import kind_of


class Invoice:
    pass


def total(lines):
    return sum(lines)


@test("Describes a class, a built-in function, a module and an instance")
def _():
    assert kind_of(Decimal) == "class"
    assert kind_of(len) == "function"
    assert kind_of(json) == "module"
    assert kind_of(Decimal("9.99")) == "instance of Decimal"


@test("Your own classes, functions and instances")
def _():
    assert kind_of(Invoice) == "class"
    assert kind_of(total) == "function"
    assert kind_of(Invoice()) == "instance of Invoice"


@test("Built-in classes are classes, including type itself")
def _():
    assert kind_of(int) == "class"
    assert kind_of(dict) == "class"
    assert kind_of(type) == "class"


@hidden("Lambdas and other built-ins are functions")
def _():
    assert kind_of(lambda price: price * 2) == "function"
    assert kind_of(print) == "function"
    assert kind_of(math.floor) == "function"


@hidden("Everything else is named by its type")
def _():
    assert kind_of(None) == "instance of NoneType"
    assert kind_of(True) == "instance of bool"
    assert kind_of([1, 2]) == "instance of list"
    assert kind_of(math) == "module"
