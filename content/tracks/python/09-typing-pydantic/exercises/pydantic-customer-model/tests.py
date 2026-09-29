from pydantic import ValidationError

from plp import hidden, raises, test
from solution import Customer

FORM = {"email": "ada@example.com", "name": "Ada", "marketing_opt_in": "true", "loyalty_points": "120"}


@test("Converts a form's strings")
def _():
    ada = Customer.model_validate(FORM)
    assert ada.marketing_opt_in is True
    assert ada.loyalty_points == 120
    assert ada.name == "Ada"


@test("Fills in the defaults")
def _():
    grace = Customer(email="grace@example.com", name="Grace")
    assert grace.marketing_opt_in is False
    assert grace.loyalty_points == 0


@test("Refuses an empty name and negative points")
def _():
    with raises(ValidationError, match="name"):
        Customer(email="alan@example.com", name="")
    with raises(ValidationError, match="loyalty_points"):
        Customer(email="alan@example.com", name="Alan", loyalty_points=-5)


@test("The email and name are required")
def _():
    with raises(ValidationError, match="email"):
        Customer.model_validate({"name": "Ada"})
    with raises(ValidationError, match="name"):
        Customer.model_validate({"email": "ada@example.com"})


@hidden("Refuses values it can't convert")
def _():
    with raises(ValidationError, match="marketing_opt_in"):
        Customer.model_validate({**FORM, "marketing_opt_in": "perhaps"})
    with raises(ValidationError, match="loyalty_points"):
        Customer.model_validate({**FORM, "loyalty_points": "lots"})
