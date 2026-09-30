from plp import hidden, test
from solution import is_allowed, sanitize

ALLOWED = {"kiln.example"}


@test("Filters the example reply")
def _():
    reply = (
        "Your refund is on its way. ![](https://collector.example/p.png?d=ada) "
        "See [our policy](https://help.kiln.example/refunds) or https://collector.example/x."
    )
    assert sanitize(reply, ALLOWED) == (
        "Your refund is on its way. [image removed] See [our policy](https://help.kiln.example/refunds) or [link removed]."
    )


@test("is_allowed compares the parsed host, not a substring")
def _():
    assert is_allowed("https://kiln.example/refunds", ALLOWED) is True
    assert is_allowed("https://help.kiln.example/refunds", ALLOWED) is True
    assert is_allowed("https://kiln.example.collector.example/", ALLOWED) is False
    assert is_allowed("https://collector.example/?next=kiln.example", ALLOWED) is False
    assert is_allowed("https://notkiln.example/", ALLOWED) is False


@test("Links to unknown domains keep their label and lose the URL")
def _():
    assert sanitize("Reset it [here](https://kiln-help.example-login.com/reset).", ALLOWED) == "Reset it here (link removed)."
    assert sanitize("Our logo: ![Kiln](https://cdn.kiln.example/logo.png)", ALLOWED) == "Our logo: ![Kiln](https://cdn.kiln.example/logo.png)"


@test("HTML images are always removed")
def _():
    assert sanitize('Done <img src="https://collector.example/p.png?d=1042"> thanks', ALLOWED) == "Done [image removed] thanks"
    assert sanitize("<IMG SRC=https://kiln.example/a.png>", ALLOWED) == "[image removed]"


@hidden("Bare URLs keep their trailing punctuation, and allowed ones stay")
def _():
    text = "Track it at https://track.kiln.example/DPD-88213, or ask at https://evil.example/q?d=card!"
    assert sanitize(text, ALLOWED) == "Track it at https://track.kiln.example/DPD-88213, or ask at [link removed]!"


@hidden("Credentials and ports don't fool the host check, and odd schemes aren't allowed")
def _():
    assert is_allowed("https://kiln.example@collector.example/", ALLOWED) is False
    assert is_allowed("https://kiln.example:8443/status", ALLOWED) is True
    assert is_allowed("javascript:alert(1)//kiln.example", ALLOWED) is False
    assert sanitize("Plain text with no links, order 1042.", ALLOWED) == "Plain text with no links, order 1042."
