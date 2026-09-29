from plp import hidden, test
from solution import sentence_chunks

POLICY = ("Cancel at least 24 hours before your appointment. Late cancellations are charged in full. "
          "We waive the fee for illness. Call reception to cancel.")


@test("Packs the cancellation policy with one sentence of overlap")
def _():
    assert sentence_chunks(POLICY, max_chars=90, overlap=1) == [
        "Cancel at least 24 hours before your appointment. Late cancellations are charged in full.",
        "Late cancellations are charged in full. We waive the fee for illness.",
        "We waive the fee for illness. Call reception to cancel.",
    ]


@test("With no overlap, every sentence appears exactly once")
def _():
    assert sentence_chunks(POLICY, max_chars=90, overlap=0) == [
        "Cancel at least 24 hours before your appointment. Late cancellations are charged in full.",
        "We waive the fee for illness. Call reception to cancel.",
    ]


@test("Everything fits in one chunk when max_chars allows it")
def _():
    assert sentence_chunks(POLICY, max_chars=1000) == [POLICY]


@test("Never cuts a sentence, even a long one")
def _():
    long = "Patients who arrive more than fifteen minutes late may be asked to rebook, and the fee still applies."
    text = f"Please arrive early. {long} Thank you."
    assert sentence_chunks(text, max_chars=40, overlap=1) == ["Please arrive early.", long, "Thank you."]


@hidden("Drops carried sentences from the front until the new chunk fits")
def _():
    text = "One two. Three four. Five six. Seven eight nine ten eleven."
    assert sentence_chunks(text, max_chars=30, overlap=2) == [
        "One two. Three four. Five six.",
        "Seven eight nine ten eleven.",
    ]
    assert sentence_chunks("Aa. Bb. Cc. Dd. Ee.", max_chars=11, overlap=2) == ["Aa. Bb. Cc.", "Bb. Cc. Dd.", "Cc. Dd. Ee."]


@hidden("Handles ! and ?, extra whitespace, and empty text")
def _():
    assert sentence_chunks("Is parking free?  Yes!\n\nIt is behind the clinic.", max_chars=25, overlap=0) == [
        "Is parking free? Yes!",
        "It is behind the clinic.",
    ]
    assert sentence_chunks("", max_chars=50) == []
    assert sentence_chunks("   \n ", max_chars=50) == []
