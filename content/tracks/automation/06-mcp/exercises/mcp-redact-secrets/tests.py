import secrets as random_tokens

from plp import hidden, test
from solution import redact

TOKEN = "tk_" + random_tokens.token_hex(6)


@test("Redacts the token in the example")
def _():
    assert redact("GET /sync?token=tk_9f2c81 failed", ["tk_9f2c81"]) == "GET /sync?token=[redacted] failed"


@test("Every occurrence of every secret")
def _():
    webhook = "whsec_" + random_tokens.token_hex(4)
    text = f"token={TOKEN}; retry token={TOKEN}; webhook secret {webhook}"
    assert redact(text, [TOKEN, webhook]) == "token=[redacted]; retry token=[redacted]; webhook secret [redacted]"


@test("Unset secrets are skipped")
def _():
    assert redact("Order 1042 shipped", [None, "", TOKEN]) == "Order 1042 shipped"


@hidden("A secret that contains another is replaced whole")
def _():
    short = TOKEN[:6]
    assert redact(f"key {TOKEN} and prefix {short}", [short, TOKEN]) == "key [redacted] and prefix [redacted]"


@hidden("Text without secrets, or no secrets at all, is unchanged")
def _():
    assert redact("", [TOKEN]) == ""
    assert redact("Nothing to hide", []) == "Nothing to hide"
