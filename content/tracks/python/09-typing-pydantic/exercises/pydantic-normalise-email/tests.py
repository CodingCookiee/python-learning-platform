from pydantic import ValidationError

from plp import hidden, raises, test
from solution import Signup


@test("Cleans the address, and refuses one without a proper domain")
def _():
    assert Signup(email=" Ada@Example.COM ", name="Ada").email == "ada@example.com"
    with raises(ValidationError, match="not an email address"):
        Signup(email="ada@example", name="Ada")


@test("Refuses addresses with a part missing")
def _():
    for bad in ["ada", "ada@", "@example.com", "   "]:
        with raises(ValidationError, match="not an email address"):
            Signup(email=bad, name="Ada")


@test("Cleans addresses from model_validate too")
def _():
    signup = Signup.model_validate({"email": "GRACE@example.org\n", "name": "Grace"})
    assert signup.email == "grace@example.org"


@hidden("Keeps the other checks")
def _():
    with raises(ValidationError, match="name"):
        Signup(email="ada@example.com", name="")
    with raises(ValidationError, match="string"):
        Signup.model_validate({"email": 1042, "name": "Ada"})
    assert Signup(email="a.lovelace@maths.example.ac.uk", name="Ada").email == "a.lovelace@maths.example.ac.uk"
