from plp import test, hidden
from solution import Employee


def raises_value_error(action):
    try:
        action()
    except ValueError:
        return True
    return False


@test("Reads and assigns like attributes")
def _():
    ada = Employee("Ada", 60000)
    assert ada.name == "Ada"
    ada.salary = 66000
    assert ada.monthly_salary == 5500.0


@test("Still refuses a negative salary, and keeps the old one")
def _():
    ada = Employee("Ada", 60000)
    assert raises_value_error(lambda: setattr(ada, "salary", -1)), "ada.salary = -1 should raise ValueError"
    assert ada.salary == 60000
    assert raises_value_error(lambda: Employee("Grace", -500)), "Employee('Grace', -500) should raise ValueError"


@test("No getter or setter methods are left")
def _():
    leftovers = sorted(name for name in vars(Employee) if name.startswith(("get_", "set_")))
    assert leftovers == []


@hidden("The name can be changed")
def _():
    ada = Employee("Ada", 60000)
    ada.name = "Ada Lovelace"
    assert ada.name == "Ada Lovelace"


@hidden("monthly_salary is read-only and rounds to cents")
def _():
    grace = Employee("Grace", 50000)
    assert grace.monthly_salary == 4166.67
    try:
        grace.monthly_salary = 0
    except AttributeError:
        return
    raise AssertionError("grace.monthly_salary = 0 should raise AttributeError")
