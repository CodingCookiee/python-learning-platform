from plp import hidden, test
from solution import render

ITEM = {
    "json": {
        "name": "Amira Haddad",
        "body": {"company": "Haddad Physio", "email": "amira@example.com"},
        "lines": [{"sku": "SEO-AUDIT", "qty": 1}, {"sku": "ADS-MGMT", "qty": 3}],
        "score": 85,
        "vip": False,
    }
}


@test("Fills keys and nested keys, with or without spaces in the braces")
def _():
    assert render("New lead: {{ $json.name }} ({{$json.body.company}})", ITEM) == "New lead: Amira Haddad (Haddad Physio)"


@test("Follows list indexes")
def _():
    assert render("First line: {{ $json.lines[0].sku }}", ITEM) == "First line: SEO-AUDIT"
    assert render("{{ $json.lines[1].qty }} x {{ $json.lines[1].sku }}", ITEM) == "3 x ADS-MGMT"


@test("A lone expression keeps its type")
def _():
    assert render("{{ $json.score }}", ITEM) == 85
    assert render("{{ $json.vip }}", ITEM) is False
    assert render("{{ $json.lines[0] }}", ITEM) == {"sku": "SEO-AUDIT", "qty": 1}


@test("Missing paths give None alone, and nothing inside text")
def _():
    assert render("{{ $json.phone }}", ITEM) is None
    assert render("Phone: {{ $json.phone }}.", ITEM) == "Phone: ."


@hidden("Indexes past the end and steps into non-containers are missing too")
def _():
    assert render("{{ $json.lines[5].sku }}", ITEM) is None
    assert render("{{ $json.name.first }}", ITEM) is None
    assert render("{{ $json.body[0] }}", ITEM) is None


@hidden("Text without expressions is returned unchanged")
def _():
    assert render("Thanks for your enquiry!", ITEM) == "Thanks for your enquiry!"
    assert render("", ITEM) == ""


@hidden("Values that aren't strings are inserted with str()")
def _():
    assert render("Score {{ $json.score }}, VIP {{ $json.vip }}", ITEM) == "Score 85, VIP False"
