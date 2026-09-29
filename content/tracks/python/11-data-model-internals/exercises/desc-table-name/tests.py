from plp import test, hidden
from solution import TableName


class Record:
    table = TableName()


class Customer(Record):
    pass


class Invoice(Record):
    pass


@test("Names the table after the class it's read through")
def _():
    assert Customer.table == "customers"
    assert Invoice().table == "invoices"
    assert Record.table == "records"


@test("Instances and classes agree")
def _():
    assert Customer().table == Customer.table
    assert Invoice.table != Customer.table


@test("It's a descriptor on the base class, not a copied string")
def _():
    assert isinstance(vars(Record)["table"], TableName)
    assert "table" not in vars(Customer)
    assert hasattr(TableName, "__get__")


@hidden("An instance can override its table")
def _():
    legacy = Customer()
    legacy.table = "tbl_customer"
    assert legacy.table == "tbl_customer"
    assert Customer().table == "customers"
    assert Customer.table == "customers"


@hidden("Works for deeper subclasses and multi-word names")
def _():
    class LineItem(Invoice):
        pass

    assert LineItem.table == "lineitems"
    assert LineItem().table == "lineitems"
