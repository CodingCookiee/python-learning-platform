from plp import test, hidden, raises
from solution import read_port


@test("Reads the port as an int")
def _():
    assert read_port({"host": "db.internal", "port": "5432"}) == 5432


@test("A missing port is a ValueError caused by the KeyError")
def _():
    with raises(ValueError, match="^missing setting: port$") as caught:
        read_port({"host": "db.internal"})
    assert type(caught.value.__cause__) is KeyError, "Chain it: raise ValueError(...) from the KeyError"


@test("A port that isn't a number is a ValueError caused by int()'s error")
def _():
    with raises(ValueError, match="^port must be a whole number, got 'eighty'$") as caught:
        read_port({"port": "eighty"})
    assert type(caught.value.__cause__) is ValueError, "Chain it: raise ValueError(...) from int()'s ValueError"


@test("A port out of range is a ValueError with no cause")
def _():
    with raises(ValueError, match="^port 70000 is out of range 1-65535$") as caught:
        read_port({"port": "70000"})
    assert caught.value.__cause__ is None
    assert caught.value.__context__ is None, "The range check isn't handling another error, so raise it outside any except block"


@hidden("Accepts both ends of the range and surrounding spaces")
def _():
    assert read_port({"port": "1"}) == 1
    assert read_port({"port": " 65535 "}) == 65535


@hidden("Refuses zero, negative and decimal ports")
def _():
    raises(ValueError, read_port, {"port": "0"}, match="port 0 is out of range")
    raises(ValueError, read_port, {"port": "-80"}, match="port -80 is out of range")
    raises(ValueError, read_port, {"port": "80.5"}, match="got '80.5'")
