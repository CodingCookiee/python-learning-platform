from contextlib import contextmanager

from plp import captured_logs, hidden, test
from plp_fakes import ScriptedLLM
from solution import triage, user_ref

EMAIL = {
    "id": "msg_5521",
    "from": "ada.byrne@example.com",
    "subject": "Refund for order 1042",
    "body": "Hi, I'm Ada. Please refund order 1042 to my card. Call me on +44 7700 900123.",
}
CARD_EMAIL = {
    "id": "msg_5522",
    "from": "Grace.Hopper@example.org",
    "subject": "Card 4111 1111 1111 1111 declined, call +44 20 7946 0958",
    "body": "My card 4111 1111 1111 1111 was declined twice for order 1043. Grace Hopper, 12 Mill Lane.",
}


class Span:
    def __init__(self, name, attributes):
        self.name, self.attributes = name, dict(attributes)

    def set(self, **attributes):
        self.attributes.update(attributes)


class Tracer:
    def __init__(self):
        self.spans = []

    @contextmanager
    def span(self, name, **attributes):
        self.spans.append(Span(name, attributes))
        yield self.spans[-1]


def run(email, label="returns"):
    llm, tracer = ScriptedLLM([label]), Tracer()
    with captured_logs("solution") as logs:
        result = triage(llm, tracer, email)
    return result, llm, tracer, logs


def kept(tracer, logs):
    """Everything the service keeps: span attributes and log lines."""
    return repr([s.attributes for s in tracer.spans]) + "\n" + logs.text


@test("Labels the example and keeps only safe span attributes")
def _():
    result, _llm, tracer, _logs = run(EMAIL)
    assert result == "returns"
    assert tracer.spans[0].attributes == {
        "user": user_ref("ada.byrne@example.com"),
        "subject": "Refund for order 1042",
        "body_chars": len(EMAIL["body"]),
        "label": "returns",
    }


@test("The logs name the email and the user, and nothing personal")
def _():
    _result, _llm, _tracer, logs = run(EMAIL)
    assert logs.messages, "triage should still log what it does"
    assert "msg_5521" in logs.text
    assert user_ref("ada.byrne@example.com") in logs.text
    for leak in ("ada.byrne@example.com", "7700 900123", "I'm Ada", "refund order 1042 to my card"):
        assert leak not in logs.text, f"{leak!r} is in the logs"


@test("The model still reads the whole email")
def _():
    _result, llm, _tracer, _logs = run(EMAIL)
    assert EMAIL["body"] in llm.calls[0]["messages"][0]["content"]


@test("A subject with a card and a phone number is redacted wherever it's kept")
def _():
    _result, _llm, tracer, logs = run(CARD_EMAIL, label="billing")
    everything = kept(tracer, logs)
    for leak in ("4111 1111 1111 1111", "7946 0958", "Grace.Hopper@example.org", "12 Mill Lane", "declined twice"):
        assert leak not in everything, f"{leak!r} was kept"
    assert tracer.spans[0].attributes["subject"] == "Card [CARD] declined, call [PHONE]"


@hidden("The same sender always gets the same user id, and no address is kept")
def _():
    _r1, _l1, first, logs1 = run(CARD_EMAIL, label="billing")
    _r2, _l2, second, logs2 = run({**CARD_EMAIL, "from": "grace.hopper@example.org"}, label="billing")
    assert first.spans[0].attributes["user"] == second.spans[0].attributes["user"]
    assert "@" not in kept(first, logs1) + kept(second, logs2)
    assert set(first.spans[0].attributes) == {"user", "subject", "body_chars", "label"}
