from plp import test, hidden
import solution


@test("Customers and employees export without their secrets")
def _():
    ada = solution.Customer(name="Ada", email="ada@example.com", password="hunter2")
    assert ada.to_dict() == {"name": "Ada", "email": "ada@example.com", "type": "customer"}
    grace = solution.Employee(name="Grace", salary=85000, bank_account="GB29NWBK")
    assert grace.to_dict() == {"name": "Grace"}


@test("Customer's MRO runs redact, then type tag, then Record")
def _():
    names = [cls.__name__ for cls in solution.Customer.__mro__]
    assert names == ["Customer", "RedactMixin", "TypeTagMixin", "Record", "object"]


@test("Exporting doesn't change the record's fields")
def _():
    ada = solution.Customer(name="Ada", password="hunter2")
    ada.to_dict()
    assert ada.fields == {"name": "Ada", "password": "hunter2"}


@hidden("The mixins cooperate with a base class they've never seen")
def _():
    class Event:
        def to_dict(self):
            return {"id": 7, "token": "abc123"}

    class PublicEvent(solution.RedactMixin, solution.TypeTagMixin, Event):
        redacted = ("token",)

    assert PublicEvent().to_dict() == {"id": 7, "type": "publicevent"}


@hidden("RedactMixin redacts nothing by default, and ignores missing keys")
def _():
    class Note(solution.RedactMixin, solution.Record):
        pass

    assert Note(text="Call back").to_dict() == {"text": "Call back"}
    assert solution.Employee(name="Linus").to_dict() == {"name": "Linus"}


@hidden("Order matters: a tag added after redacting survives")
def _():
    class AuditEntry(solution.TypeTagMixin, solution.RedactMixin, solution.Record):
        redacted = ("type", "ip")

    assert AuditEntry(action="login", ip="10.0.0.1").to_dict() == {"action": "login", "type": "auditentry"}
