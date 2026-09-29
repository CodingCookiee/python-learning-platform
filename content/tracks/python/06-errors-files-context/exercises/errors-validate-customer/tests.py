from plp import test, hidden, raises
from solution import FieldError, validate_customer


def problems(record):
    """The messages of the FieldErrors in the group validate_customer(record) raises."""
    caught = raises(ExceptionGroup, validate_customer, record)
    group = caught.value
    assert group.message == "invalid customer"
    kinds = sorted({type(e).__name__ for e in group.exceptions} - {"FieldError"})
    assert kinds == [], "Every member of the group should be a FieldError"
    return [str(e) for e in group.exceptions]


@test("Cleans a valid record")
def _():
    record = {"name": " Ada Lovelace ", "email": "ADA@example.com", "age": "36"}
    assert validate_customer(record) == {"name": "Ada Lovelace", "email": "ada@example.com", "age": 36}


@test("Reports all three problems at once, in field order")
def _():
    record = {"name": "", "email": "ada.example.com", "age": "12"}
    assert problems(record) == ["name is required", "email must contain @", "age must be between 18 and 120"]


@test("One problem still raises a group")
def _():
    record = {"name": "Grace Hopper", "email": "grace@example.com", "age": "forty"}
    assert problems(record) == ["age must be a whole number"]


@test("Each FieldError knows its field")
def _():
    group = raises(ExceptionGroup, validate_customer, {"name": " ", "email": "x", "age": "30"}).value
    assert [e.field for e in group.exceptions] == ["name", "email"]


@hidden("Missing keys count as empty")
def _():
    assert problems({}) == ["name is required", "email must contain @", "age must be a whole number"]


@hidden("Accepts both ends of the age range, and doesn't change the input")
def _():
    record = {"name": "Linus", "email": " Linus@Example.org ", "age": " 18 "}
    assert validate_customer(record) == {"name": "Linus", "email": "linus@example.org", "age": 18}
    assert record["email"] == " Linus@Example.org "
    assert validate_customer({"name": "Mary", "email": "m@x.io", "age": "120"})["age"] == 120
    assert problems({"name": "Mary", "email": "m@x.io", "age": "121"}) == ["age must be between 18 and 120"]
