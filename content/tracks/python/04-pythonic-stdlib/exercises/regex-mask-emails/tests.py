from plp import test, hidden
from solution import mask_emails


@test("Masks every address in the text")
def _():
    assert mask_emails("Contact raza@rain.one or support@shop.example.com") == (
        "Contact r***@rain.one or s***@shop.example.com"
    )


@test("Leaves text without addresses unchanged")
def _():
    assert mask_emails("No contact details here.") == "No contact details here."


@test("Keeps a full stop after an address")
def _():
    assert mask_emails("Email ada@lovelace.dev.") == "Email a***@lovelace.dev."


@hidden("Masks local parts with dots and plus signs")
def _():
    assert mask_emails("grace.hopper+navy@navy.mil wrote") == "g***@navy.mil wrote"


@hidden("Handles a one-character local part")
def _():
    assert mask_emails("a@b.io") == "a***@b.io"
