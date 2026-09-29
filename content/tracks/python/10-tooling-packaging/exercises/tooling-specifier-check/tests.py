from plp import test, hidden, raises
from solution import satisfies


@test("Checks the examples")
def _():
    assert satisfies("0.28.1", ">=0.27,<1") is True
    assert satisfies("1.10.0", ">=1.9") is True
    assert satisfies("3.0.0", ">=2.7, <3") is False


@test("Supports every operator")
def _():
    assert satisfies("14.1.0", "==14.1.0") is True
    assert satisfies("8.2.0", "!=8.2.0") is False
    assert satisfies("8.2.1", "!=8.2.0") is True
    assert satisfies("2.7.0", ">2.7") is False
    assert satisfies("2.6.9", "<=2.7") is True


@test("Compares numbers, not text")
def _():
    assert satisfies("1.9.3", "<1.10") is True
    assert satisfies("0.100.0", ">0.99") is True


@test("Missing parts count as zero")
def _():
    assert satisfies("2.0", "==2.0.0") is True
    assert satisfies("3", ">=2.7,<3.0.0") is False


@hidden("Allows spaces, and an empty specifier allows anything")
def _():
    assert satisfies("2.9.0", "  >= 2.7 ,  < 3  ") is True
    assert satisfies("0.0.1", "") is True


@hidden("Refuses operators it doesn't support")
def _():
    raises(ValueError, satisfies, "1.0.0", "=>1.0")
    raises(ValueError, satisfies, "1.4.2", "~=1.4")
