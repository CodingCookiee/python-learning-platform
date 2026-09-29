from plp import test, hidden, raises, source_avoids
from solution import make_record


@test("Builds a record class from a name and fields")
def _():
    StockLine = make_record("StockLine", ["sku", "quantity"])
    line = StockLine("MUG-01", quantity=12)
    assert line.quantity == 12
    assert repr(line) == "StockLine(sku='MUG-01', quantity=12)"
    assert StockLine.fields == ("sku", "quantity")
    assert line == StockLine("MUG-01", 12)
    raises(TypeError, StockLine, "MUG-01")


@test("It's a real class, made with type() and no class statement")
def _():
    Customer = make_record("Customer", ("name", "email"))
    assert type(Customer) is type
    assert Customer.__name__ == "Customer"
    assert isinstance(Customer("Ada", "ada@example.com"), Customer)
    assert source_avoids(node="ClassDef"), "Build the class with type(name, bases, namespace), not a class statement"


@test("Unknown and repeated fields are refused")
def _():
    StockLine = make_record("StockLine", ["sku", "quantity"])
    raises(TypeError, StockLine, "MUG-01", 12, 3)
    raises(TypeError, StockLine, "MUG-01", colour="blue", quantity=1)
    raises(TypeError, StockLine, "MUG-01", sku="MUG-02", quantity=1)


@hidden("Equality needs the same record class and the same values")
def _():
    StockLine = make_record("StockLine", ["sku", "quantity"])
    Delivery = make_record("Delivery", ["sku", "quantity"])
    assert StockLine("MUG-01", 12) != StockLine("MUG-01", 13)
    assert StockLine("MUG-01", 12) != Delivery("MUG-01", 12)
    assert StockLine("MUG-01", 12) != ("MUG-01", 12)


@hidden("Each class keeps its own fields")
def _():
    Invoice = make_record("Invoice", ["number", "total", "currency"])
    Payment = make_record("Payment", ["invoice"])
    invoice = Invoice(number="INV-7", total=120, currency="EUR")
    assert repr(invoice) == "Invoice(number='INV-7', total=120, currency='EUR')"
    assert repr(Payment(invoice)) == "Payment(invoice=Invoice(number='INV-7', total=120, currency='EUR'))"
    assert Invoice.fields == ("number", "total", "currency")
    assert Payment.fields == ("invoice",)
