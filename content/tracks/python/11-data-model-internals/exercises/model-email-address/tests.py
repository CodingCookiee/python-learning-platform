from plp import test, hidden, raises
from solution import EmailAddress


@test("Normalises the domain but not the local part")
def _():
    ada = EmailAddress("Ada@Example.COM")
    assert ada.domain == "example.com"
    assert str(ada) == "Ada@example.com"
    assert ada == EmailAddress("Ada@example.com")
    assert ada != EmailAddress("ada@example.com")
    assert len({ada, EmailAddress("Ada@EXAMPLE.com")}) == 1


@test("Works as a dict key whatever case the domain was typed in")
def _():
    preferences = {EmailAddress("grace@Navy.mil"): "weekly"}
    assert preferences[EmailAddress("grace@NAVY.MIL")] == "weekly"
    assert EmailAddress("Grace@navy.mil") not in preferences


@test("Equal addresses have equal hashes")
def _():
    assert hash(EmailAddress("ops@Shop.Example")) == hash(EmailAddress("ops@shop.example"))
    assert repr(EmailAddress("ops@Shop.Example")) == "EmailAddress('ops@shop.example')"


@test("Refuses text that isn't an address")
def _():
    raises(ValueError, EmailAddress, "ada.example.com")
    raises(ValueError, EmailAddress, "@example.com")
    raises(ValueError, EmailAddress, "ada@")


@hidden("Can't be changed after it's made")
def _():
    ada = EmailAddress("ada@example.com")
    with raises(AttributeError, what="ada.domain = 'evil.example'"):
        ada.domain = "evil.example"
    with raises(AttributeError, what="ada.local = 'eve'"):
        ada.local = "eve"
    with raises(AttributeError, what="ada.nickname = 'Countess'"):
        ada.nickname = "Countess"
    assert str(ada) == "ada@example.com"


@hidden("Never equal to a plain string")
def _():
    ada = EmailAddress("ada@example.com")
    assert ada.__eq__("ada@example.com") is NotImplemented
    assert ada != "ada@example.com"


@hidden("Splits on the last @")
def _():
    odd = EmailAddress('"billing@desk"@Example.org')
    assert odd.local == '"billing@desk"'
    assert odd.domain == "example.org"
