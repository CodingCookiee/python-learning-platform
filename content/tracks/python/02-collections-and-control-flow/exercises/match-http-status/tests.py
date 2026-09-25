from plp import test, hidden
from solution import status_label


@test("Labels 404 and 502")
def _():
    assert status_label(404) == "Not found"
    assert status_label(502) == "Server error"


@test("Labels 200 and 201")
def _():
    assert status_label(200) == "OK"
    assert status_label(201) == "Created"


@test("Groups all three server errors")
def _():
    assert status_label(500) == "Server error"
    assert status_label(503) == "Server error"


@hidden("Labels every other code as unknown")
def _():
    assert status_label(418) == "Unknown"
    assert status_label(301) == "Unknown"
    assert status_label(501) == "Unknown"
