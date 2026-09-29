from plp import test, hidden
from solution import TaxRate


@test("Calling a rate adds its tax")
def _():
    vat = TaxRate("UK VAT", 20)
    assert vat(10.00) == 12.0
    assert vat(19.99) == 23.99
    assert list(map(vat, [5.00, 2.50])) == [6.0, 3.0]
    assert repr(vat) == "TaxRate('UK VAT', 20)"


@test("Instances are callable because the class defines __call__")
def _():
    gst = TaxRate("NZ GST", 15)
    assert callable(gst)
    assert "__call__" in vars(TaxRate)
    assert gst(100) == 115.0


@hidden("Works anywhere a function is expected")
def _():
    reduced = TaxRate("Reduced VAT", 5)
    assert sorted([30.0, 10.0, 20.0], key=reduced) == [10.0, 20.0, 30.0]
    assert reduced(7.99) == 8.39


@hidden("A zero rate leaves the amount unchanged")
def _():
    exempt = TaxRate("Exempt", 0)
    assert exempt(42.5) == 42.5
    assert repr(exempt) == "TaxRate('Exempt', 0)"
