from plp import test, hidden, source_uses
from solution import unique_emails


@test("Keeps the first spelling of each address, in order")
def _():
    emails = ["Ada@example.com", "grace@example.com", " ada@EXAMPLE.com", "ken@example.com"]
    assert unique_emails(emails) == ["Ada@example.com", "grace@example.com", "ken@example.com"]


@test("Returns an empty list for an empty mailing list")
def _():
    assert unique_emails([]) == []


@test("Remembers seen addresses in a set")
def _():
    assert source_uses(call="set") or source_uses(node="Set") or source_uses(node="SetComp"), (
        "Keep the addresses you've already seen in a set, e.g. seen = set(), and check membership against it"
    )


@hidden("Leaves the original list unchanged")
def _():
    emails = ["ken@example.com", "KEN@example.com"]
    unique_emails(emails)
    assert emails == ["ken@example.com", "KEN@example.com"]


@hidden("Keeps one copy of an address repeated many times")
def _():
    emails = [f"user{n % 50}@example.com" for n in range(200)]
    result = unique_emails(emails)
    assert len(result) == 50
    assert result[0] == "user0@example.com" and result[-1] == "user49@example.com"
