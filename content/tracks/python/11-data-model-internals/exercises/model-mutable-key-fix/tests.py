from plp import test, hidden, raises
from solution import Sku, StockBook


@test("Renaming a code keeps its stock")
def _():
    book = StockBook()
    book.add(Sku("mug-01"), 12)
    book.rename(Sku("MUG-01"), "mug-02")
    assert book.count(Sku("MUG-02")) == 12
    assert book.count(Sku("MUG-01")) == 0


@test("A Sku can't be changed once it's made")
def _():
    sku = Sku("lamp-02")
    with raises(AttributeError, what="sku.code = 'LAMP-03'"):
        sku.code = "LAMP-03"
    assert sku.code == "LAMP-02"
    assert hash(sku) == hash(Sku("LAMP-02"))


@test("Codes still compare case-insensitively")
def _():
    assert Sku("mug-01") == Sku("MUG-01")
    assert Sku("mug-01") != Sku("mug-02")
    assert repr(Sku("mug-01")) == "Sku('MUG-01')"
    assert len({Sku("mug-01"), Sku("MUG-01"), Sku("Mug-01")}) == 1


@hidden("Renaming onto a code that has stock adds the counts")
def _():
    book = StockBook()
    book.add(Sku("MUG-01"), 12)
    book.add(Sku("MUG-02"), 5)
    book.rename(Sku("MUG-01"), "MUG-02")
    assert book.count(Sku("MUG-02")) == 17
    assert book.count(Sku("MUG-01")) == 0
    book.add(Sku("MUG-01"), 3)
    assert book.count(Sku("MUG-01")) == 3


@hidden("Renaming a code with no stock changes nothing")
def _():
    book = StockBook()
    book.add(Sku("MUG-01"), 12)
    book.rename(Sku("TEA-9"), "TEA-10")
    assert book.count(Sku("TEA-10")) == 0
    assert book.count(Sku("MUG-01")) == 12


@hidden("The Sku passed to rename is left alone")
def _():
    book = StockBook()
    original = Sku("MUG-01")
    book.add(original, 4)
    book.rename(original, "MUG-99")
    assert original.code == "MUG-01"
    assert book.count(Sku("MUG-99")) == 4
