from plp import hidden, test
from solution import scrub_emails


@test("Scrubs the email out of a CRM link")
def _():
    assert scrub_emails("Booked via https://crm.example/contacts?email=amira@haddadphysio.example&tab=notes") == (
        "Booked via https://crm.example/contacts?email=[email]&tab=notes")


@test("Scrubs emails in brackets, and keeps the punctuation around them")
def _():
    assert scrub_emails("Contact Amira (amira@haddadphysio.example).") == "Contact Amira ([email])."


@test("Scrubs mailto links")
def _():
    assert scrub_emails("[Email us](mailto:hello@petalandpine.example)") == "[Email us](mailto:[email])"


@test("Scrubs percent-encoded emails")
def _():
    assert scrub_emails("unsubscribe?u=tom%40northfold.example&list=7") == "unsubscribe?u=[email]&list=7"


@hidden("Plain emails are still scrubbed, and the spacing is left alone")
def _():
    assert scrub_emails("Email tom@northfold.example  or nia@okafor.example.\nThanks") == (
        "Email [email]  or [email].\nThanks")


@hidden("Text without emails is unchanged")
def _():
    text = "Order #1042 shipped @ 09:00 to https://shop.example/track?id=1042"
    assert scrub_emails(text) == text
