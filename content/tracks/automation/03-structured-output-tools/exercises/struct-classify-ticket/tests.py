from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import LABELS, TicketLabel, classify_ticket

TICKET = "My parcel from order 1042 never arrived."
SHIPPING = '{"category": "shipping", "confidence": 0.92, "reason": "The parcel has not arrived."}'


@test("Classifies the example ticket")
def _():
    llm = ScriptedLLM([SHIPPING])
    label = classify_ticket(llm, TICKET)
    assert label.category == "shipping"
    assert label.confidence == 0.92


@test("Lists every label with its definition in the system prompt")
def _():
    llm = ScriptedLLM([SHIPPING])
    classify_ticket(llm, TICKET)
    system = llm.calls[0]["system"] or ""
    missing = [label for label, definition in LABELS.items() if f"- {label}: {definition}" not in system]
    assert missing == [], f"These labels aren't listed as '- label: definition': {missing}"


@test("Sends the ticket in tags, with a strict schema, at temperature 0")
def _():
    llm = ScriptedLLM([SHIPPING])
    classify_ticket(llm, TICKET)
    call = llm.calls[0]
    assert call["messages"] == [{"role": "user", "content": f"<ticket>\n{TICKET}\n</ticket>"}]
    assert call["temperature"] == 0
    schema = call.get("schema") or {}
    assert schema.get("additionalProperties") is False
    assert schema.get("required") == ["category", "confidence", "reason"]
    assert schema["properties"]["category"].get("enum") == ["billing", "shipping", "returns", "technical", "unknown"]


@test("Returns unknown instead of raising on a label that isn't on the list")
def _():
    llm = ScriptedLLM(['{"category": "refunds", "confidence": 0.8, "reason": "Wants money back."}'])
    label = classify_ticket(llm, "I want my money back")
    assert (label.category, label.confidence) == ("unknown", 0.0)


@hidden("Returns unknown for an impossible confidence, extra fields, or a reply that isn't JSON")
def _():
    for reply in (
        '{"category": "billing", "confidence": 1.3, "reason": "Card charged twice."}',
        '{"category": "billing", "confidence": 0.9, "reason": "Card charged twice.", "priority": "high"}',
        "It's about billing, I think.",
    ):
        label = classify_ticket(ScriptedLLM([reply]), "Charged twice")
        assert (label.category, label.confidence) == ("unknown", 0.0), f"for the reply {reply!r}"


@hidden("TicketLabel enforces the contract on its own")
def _():
    assert TicketLabel(category="returns", confidence=1, reason="Exchange a size.").confidence == 1
    try:
        TicketLabel(category="Returns", confidence=0.5, reason="x")
    except ValueError:
        return
    raise AssertionError("TicketLabel(category='Returns', ...) should be refused: labels are lowercase")
