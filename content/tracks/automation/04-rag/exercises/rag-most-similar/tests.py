from plp import hidden, test
from plp_fakes import fake_embed
from solution import most_similar

FAQS = [
    "How do I cancel an appointment? Call reception at least 24 hours before your appointment.",
    "What does a first physiotherapy assessment cost? A first assessment costs 65 pounds.",
    "Is there parking at the clinic? There is free parking behind the clinic.",
    "Do you accept health insurance? We accept most major health insurers.",
    "What should I wear to my appointment? Wear loose, comfortable clothing.",
]


class Recorder:
    """Wraps fake_embed and remembers every call."""

    def __init__(self, scale=1.0):
        self.calls = []
        self.scale = scale

    def __call__(self, texts):
        self.calls.append(list(texts))
        return [[x * self.scale for x in v] for v in fake_embed(texts)]


def rounded(results):
    return [(faq, round(score, 3)) for faq, score in results]


@test("Finds the assessment price for a question about cost")
def _():
    assert rounded(most_similar("How much does an assessment cost?", FAQS[:3], fake_embed, k=2)) == [
        (FAQS[1], 0.539),
        (FAQS[2], 0.234),
    ]


@test("Calls embed once, with the question first and then every FAQ")
def _():
    embed = Recorder()
    most_similar("I need to cancel my appointment tomorrow", FAQS, embed)
    assert embed.calls == [["I need to cancel my appointment tomorrow", *FAQS]]


@test("Returns at most k pairs, best first, with plain float scores")
def _():
    results = most_similar("I need to cancel my appointment tomorrow", FAQS, fake_embed, k=3)
    assert [faq for faq, _ in results] == [FAQS[0], FAQS[2], FAQS[4]]
    assert all(type(score) is float for _, score in results)


@test("Works when the vectors aren't normalised")
def _():
    results = most_similar("How much does an assessment cost?", FAQS[:3], Recorder(scale=7.5), k=2)
    assert rounded(results) == [(FAQS[1], 0.539), (FAQS[2], 0.234)]


@hidden("A k larger than the list returns everything, and no FAQs means no embed call")
def _():
    assert len(most_similar("where can I park", FAQS, fake_embed, k=50)) == 5
    embed = Recorder()
    assert most_similar("where can I park", [], embed) == []
    assert embed.calls == []


@hidden("Equal scores keep the FAQs' original order")
def _():
    faqs = ["Free parking behind the clinic.", "Opening hours are 8am to 8pm.", "Free parking behind the clinic."]
    results = most_similar("parking", faqs, fake_embed, k=3)
    assert [faq for faq, _ in results][:2] == [faqs[0], faqs[2]]
    assert round(results[0][1], 6) == round(results[1][1], 6)
