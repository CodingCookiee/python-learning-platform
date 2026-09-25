from plp import test, hidden
from solution import EmailNotifier, Notifier, SmsNotifier


def raises(error, action):
    try:
        action()
    except error:
        return True
    return False


@test("Broadcasts an email once per recipient")
def _():
    email = EmailNotifier()
    results = email.broadcast(["ada@example.com", "grace@example.com", "ada@example.com"], "Invoice ready")
    assert results == ["email to ada@example.com: Invoice ready", "email to grace@example.com: Invoice ready"]
    assert len(email.sent) == 2


@test("Notifier itself can't be instantiated")
def _():
    assert raises(TypeError, Notifier), "Notifier() should raise TypeError"
    assert getattr(Notifier, "__abstractmethods__", set()) == {"send"}, "send should be the one abstract method"


@test("A subclass that doesn't implement send can't be instantiated either")
def _():
    class PagerNotifier(Notifier):
        def page(self, number):
            return number

    assert raises(TypeError, PagerNotifier), "A Notifier subclass without send() should raise TypeError"


@test("SMS messages are cut to 160 characters")
def _():
    sms = SmsNotifier()
    long_message = "x" * 200
    result = sms.notify("+447700900123", long_message)
    assert result == "sms to +447700900123: " + "x" * 157 + "..."
    assert sms.notify("+447700900123", "Your parcel is out for delivery") == (
        "sms to +447700900123: Your parcel is out for delivery"
    )


@hidden("A message of exactly 160 characters is left alone")
def _():
    exact = "y" * 160
    assert SmsNotifier().send("+447700900123", exact) == "sms to +447700900123: " + exact


@hidden("Email refuses an address without @, and records nothing")
def _():
    email = EmailNotifier()
    assert raises(ValueError, lambda: email.notify("ada.example.com", "Hi")), "should raise ValueError"
    assert email.sent == []


@hidden("Each notifier keeps its own sent list")
def _():
    first, second = EmailNotifier(), SmsNotifier()
    first.notify("ada@example.com", "Hi")
    assert second.sent == []
    assert first.sent == ["email to ada@example.com: Hi"]
