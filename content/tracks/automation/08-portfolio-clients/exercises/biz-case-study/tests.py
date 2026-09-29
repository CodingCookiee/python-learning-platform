from plp import hidden, raises, test
from solution import render_case_study

NAMES = {"Brightsmile Dental": "a dental clinic", "Dr Sara Khan": "the practice owner"}
BRIGHTSMILE = {
    "client": "Brightsmile Dental",
    "problem": ("Reception at Brightsmile Dental spent 90 minutes every morning phoning patients about their "
                "appointments, and about 24 patients a month still didn't turn up."),
    "approach": [
        "Mapped the reminder process with Dr Sara Khan, including patients without SMS consent",
        "Built a scheduled job that texts or emails each patient 24 hours ahead, and lists the ones it couldn't reach",
        "Piloted it on one dentist's diary for two weeks before switching everyone over",
    ],
    "metrics": [
        {"label": "No-shows", "before": 24, "after": 9, "unit": "a month"},
        {"label": "Reminder calls", "before": 90, "after": 5, "unit": "min a day"},
    ],
    "period": "the first three months",
    "stack": ["Python", "FastAPI", "an SMS API"],
    "quote": "Reception has its mornings back, and the diary is fuller than it's been for years.",
}

EXPECTED = """# No-shows down 63% at a dental clinic

Python · FastAPI · an SMS API

## Result
Measured over the first three months:
- No-shows: 24 → 9 a month (-63%)
- Reminder calls: 90 → 5 min a day (-94%)

## Problem
Reception at a dental clinic spent 90 minutes every morning phoning patients about their appointments, and about 24 patients a month still didn't turn up.

## Approach
- Mapped the reminder process with the practice owner, including patients without SMS consent
- Built a scheduled job that texts or emails each patient 24 hours ahead, and lists the ones it couldn't reach
- Piloted it on one dentist's diary for two weeks before switching everyone over

> "Reception has its mornings back, and the diary is fuller than it's been for years.\""""


@test("Renders the clinic's case study")
def _():
    assert render_case_study(BRIGHTSMILE, NAMES) == EXPECTED


@test("Nobody is named anywhere in it")
def _():
    text = render_case_study(BRIGHTSMILE, NAMES).lower()
    assert "brightsmile" not in text
    assert "sara" not in text


@test("A case study needs a number, and the headline needs a before value")
def _():
    raises(ValueError, render_case_study, {**BRIGHTSMILE, "metrics": []}, NAMES)
    new = {"label": "Same-day quotes", "before": 0, "after": 14, "unit": "a week"}
    raises(ValueError, render_case_study, {**BRIGHTSMILE, "metrics": [new]}, NAMES)


@test("An increase is 'up', and optional sections are left out")
def _():
    shop = {
        "client": "Petal & Pine",
        "problem": "Petal & Pine asked for reviews by hand, when someone remembered.",
        "approach": ["Sent a review request 3 days after delivery"],
        "metrics": [{"label": "Reviews collected", "before": 8, "after": 31, "unit": "a month"}],
    }
    assert render_case_study(shop, {"Petal & Pine": "an online florist"}) == (
        "# Reviews collected up 288% at an online florist\n\n"
        "## Result\n- Reviews collected: 8 → 31 a month (+288%)\n\n"
        "## Problem\nan online florist asked for reviews by hand, when someone remembered.\n\n"
        "## Approach\n- Sent a review request 3 days after delivery")


@hidden("The quote is anonymised too")
def _():
    study = {**BRIGHTSMILE, "quote": "Ask Dr Sara Khan on 020 7946 0321 or sara@brightsmile.example."}
    assert render_case_study(study, NAMES).endswith('> "Ask the practice owner on [phone] or [email]."')


@hidden("A metric with a zero before is fine after the first")
def _():
    extra = {"label": "Same-day quotes", "before": 0, "after": 14, "unit": "a week"}
    study = {**BRIGHTSMILE, "metrics": BRIGHTSMILE["metrics"] + [extra], "period": ""}
    text = render_case_study(study, NAMES)
    assert "- Same-day quotes: 0 → 14 a week" in text
    assert "Measured over" not in text
