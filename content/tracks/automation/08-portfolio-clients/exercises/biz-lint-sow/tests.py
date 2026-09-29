from plp import hidden, test
from solution import lint_deliverables


@test("Flags the vague and open-ended deliverables")
def _():
    assert lint_deliverables([
        "Improve the reporting process",
        "A daily sales report emailed to 3 managers by 08:00",
        "Chatbot answers FAQs, bookings, etc.",
    ]) == [(0, "vague word: improve"), (0, "no number"), (2, "open-ended: etc"), (2, "no number")]


@test("Testable deliverables pass")
def _():
    assert lint_deliverables([
        "Reminder texts sent 24 hours before every appointment",
        "90% of test tickets on the agreed set of 200 routed to the right queue",
    ]) == []


@test("Every form of a vague word counts, each word once, in order")
def _():
    assert lint_deliverables(["Optimised, enhanced and improved workflow, then improved again"]) == [
        (0, "vague word: optimised"), (0, "vague word: enhanced"), (0, "vague word: improved"), (0, "no number"),
    ]


@test("Open-ended phrases are matched as whole words, in any case")
def _():
    assert lint_deliverables(["Support As Needed for 3 months, and more"]) == [
        (0, "open-ended: and more"), (0, "open-ended: as needed"),
    ]
    assert lint_deliverables(["Export 4 fetch jobs to the data store"]) == []


@hidden("Several problems in one deliverable come in the documented order")
def _():
    assert lint_deliverables(["Ongoing seamless integrations, streamlined onboarding, etc"]) == [
        (0, "vague word: seamless"), (0, "vague word: streamlined"),
        (0, "open-ended: etc"), (0, "open-ended: ongoing"), (0, "no number"),
    ]


@hidden("An empty list has no problems")
def _():
    assert lint_deliverables([]) == []
