from plp import hidden, test
from solution import anonymise

CLINIC = {"Brightsmile Dental": "a dental clinic", "Dr Sara Khan": "the practice owner"}


@test("Anonymises the clinic's quote")
def _():
    assert anonymise(
        "Dr Sara Khan at Brightsmile Dental (sara@brightsmile.example, 020 7946 0321) said "
        "BRIGHTSMILE DENTAL's no-shows fell.",
        CLINIC,
    ) == "the practice owner at a dental clinic ([email], [phone]) said a dental clinic's no-shows fell."


@test("International numbers are phones; dates and order numbers aren't")
def _():
    assert anonymise("Call +44 20 7946 0958 about order 10423 from 2026-10-05.", {}) == (
        "Call [phone] about order 10423 from 2026-10-05.")


@test("Longer names are tried first")
def _():
    names = {"Brightsmile": "the clinic", "Brightsmile Dental Group": "a group of dental clinics"}
    assert anonymise("Brightsmile Dental Group owns Brightsmile.", names) == (
        "a group of dental clinics owns the clinic.")


@test("Names are replaced as whole words only")
def _():
    assert anonymise("Tom said the Tomato Co. order was late.", {"Tom": "the owner"}) == (
        "the owner said the Tomato Co. order was late.")


@hidden("Every email is replaced, including ones that contain a client name")
def _():
    text = "Write to nia@okafor-logistics.example or ops.team+alerts@okafor-logistics.example."
    assert anonymise(text, {"Okafor Logistics": "a logistics firm"}) == "Write to [email] or [email]."


@hidden("Names with regex characters are matched literally")
def _():
    assert anonymise("Petal & Pine (UK) Ltd. grew fast.", {"Petal & Pine (UK) Ltd.": "an online florist"}) == (
        "an online florist grew fast.")
