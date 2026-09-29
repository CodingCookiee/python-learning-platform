from plp import test, hidden, raises, source_avoids
from solution import Property


def build():
    """The example classes, built when a test runs (so a missing setter fails that test)."""
    class Employee:
        def __init__(self, name, salary):
            self.name = name
            self.salary = salary

        @Property
        def salary(self):
            """Annual salary."""
            return self._salary

        @salary.setter
        def salary(self, value):
            if value < 0:
                raise ValueError("salary can't be negative")
            self._salary = value

        @Property
        def monthly(self):
            return round(self.salary / 12, 2)

    class Account:
        def __init__(self, owner):
            self.owner = owner
            self._closed = False

        @Property
        def status(self):
            return "closed" if self._closed else "open"

        @status.deleter
        def status(self):
            self._closed = True

    return Employee, Account


@test("Works like property for getters and setters")
def _():
    Employee, _ = build()
    ada = Employee("Ada", 60000)
    ada.salary = 66000
    assert ada.monthly == 5500.0
    raises(AttributeError, setattr, ada, "monthly", 1, match="monthly")
    assert Employee.salary.__doc__ == "Annual salary."


@test("The setter runs, at creation and afterwards")
def _():
    Employee, _ = build()
    raises(ValueError, Employee, "Grace", -1)
    grace = Employee("Grace", 50000)
    raises(ValueError, setattr, grace, "salary", -5)
    assert grace.salary == 50000
    assert vars(grace) == {"name": "Grace", "_salary": 50000}


@test("Read on the class, it's the Property, and no built-in property is used")
def _():
    Employee, _ = build()
    assert isinstance(Employee.salary, Property)
    assert isinstance(vars(Employee)["monthly"], Property)
    assert source_avoids(name="property"), "Build it from the descriptor methods, not the built-in property"


@hidden("setter and deleter return new Property objects that keep the other functions")
def _():
    base = Property(lambda self: "open")
    with_setter = base.setter(lambda self, value: None)
    assert with_setter is not base
    assert base.fset is None
    assert with_setter.fget is base.fget
    with_deleter = with_setter.deleter(lambda self: None)
    assert (with_deleter.fget, with_deleter.fset) == (base.fget, with_setter.fset)


@hidden("Deleting uses the deleter, or refuses")
def _():
    Employee, Account = build()
    account = Account("Ada")
    assert account.status == "open"
    del account.status
    assert account.status == "closed"
    ada = Employee("Ada", 60000)
    raises(AttributeError, delattr, ada, "monthly", match="monthly")


@hidden("The instance dict can't shadow it")
def _():
    Employee, _ = build()
    ada = Employee("Ada", 60000)
    ada.__dict__["monthly"] = "shadowed"
    ada.__dict__["salary"] = -1
    assert ada.monthly == 5000.0
    assert ada.salary == 60000


@hidden("A Property with no getter can't be read")
def _():
    class Vault:
        code = Property(None, lambda self, value: None)

    vault = Vault()
    vault.code = "1234"
    raises(AttributeError, getattr, vault, "code", match="code")
