from plp import hidden, raises, test
from solution import handle_delivery


class FakeCRM:
    def __init__(self, failures=0):
        self.contacts = []
        self.failures = failures

    def create_contact(self, data):
        if self.failures:
            self.failures -= 1
            raise ConnectionError("CRM unavailable")
        self.contacts.append(data)
        return f"c_{len(self.contacts)}"


def lead_event(id="evt_1042", email="amira@example.com"):
    return {"id": id, "type": "lead.created", "data": {"email": email, "name": "Amira Haddad"}}


@test("The same delivery twice creates one contact")
def _():
    crm, processed = FakeCRM(), set()
    assert handle_delivery(lead_event(), processed, crm) == "created"
    assert handle_delivery(lead_event(), processed, crm) == "duplicate"
    assert len(crm.contacts) == 1


@test("A retry after a CRM failure still creates the contact")
def _():
    crm, processed = FakeCRM(failures=1), set()
    raises(ConnectionError, handle_delivery, lead_event(), processed, crm)
    assert handle_delivery(lead_event(), processed, crm) == "created"
    assert crm.contacts == [{"email": "amira@example.com", "name": "Amira Haddad"}]


@test("Different events are both processed")
def _():
    crm, processed = FakeCRM(), set()
    handle_delivery(lead_event("evt_1"), processed, crm)
    handle_delivery(lead_event("evt_2", "tom@example.com"), processed, crm)
    assert [c["email"] for c in crm.contacts] == ["amira@example.com", "tom@example.com"]


@hidden("Other event types are ignored and don't reach the CRM")
def _():
    crm, processed = FakeCRM(), set()
    event = {"id": "evt_9", "type": "form.viewed", "data": {}}
    assert handle_delivery(event, processed, crm) == "ignored"
    assert crm.contacts == []


@hidden("A failed attempt doesn't record the id")
def _():
    crm, processed = FakeCRM(failures=1), set()
    raises(ConnectionError, handle_delivery, lead_event(), processed, crm)
    assert "evt_1042" not in processed


@hidden("A duplicate is recognised even across a restart, from the stored ids")
def _():
    crm = FakeCRM()
    assert handle_delivery(lead_event(), {"evt_1042"}, crm) == "duplicate"
    assert crm.contacts == []
