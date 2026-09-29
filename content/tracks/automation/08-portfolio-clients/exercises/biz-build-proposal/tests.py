from decimal import Decimal

from plp import hidden, raises, test
from solution import build_proposal

HARBOUR = {
    "title": "Monthly client reports for Harbour & Finch",
    "goal": "Every client gets an accurate monthly report on the 1st, without anyone building it by hand.",
    "deliverables": [
        {"title": "Automated monthly report", "acceptance": [
            "A report for each of the 12 clients is emailed by 09:00 on the first working day",
            "Spend and conversion figures match the ad platforms' exports to the cent"]},
        {"title": "AI-written summary", "acceptance": [
            "An account manager can approve or edit each summary before it is sent",
            "At least 9 of 10 sample summaries pass the agreed review checklist"]},
    ],
    "out_of_scope": ["Changes to the agency's ad accounts",
                     "Reports for clients added after sign-off, quoted separately"],
    "total": Decimal("6000"),
    "milestones": [("Deposit", 30, 0), ("Pilot with 2 clients", 40, 3), ("Handover", 30, 5)],
    "assumptions": ["The agency provides read-only API access to both ad platforms by week 1"],
    "risks": [{"risk": "an ad platform rate-limits the nightly export",
               "mitigation": "fetch incrementally, retry with backoff, and alert after two failed nights"}],
}

EXPECTED = """# Monthly client reports for Harbour & Finch

## Goal
Every client gets an accurate monthly report on the 1st, without anyone building it by hand.

## Deliverables
1. Automated monthly report
2. AI-written summary

## Acceptance criteria
### 1. Automated monthly report
- A report for each of the 12 clients is emailed by 09:00 on the first working day
- Spend and conversion figures match the ad platforms' exports to the cent
### 2. AI-written summary
- An account manager can approve or edit each summary before it is sent
- At least 9 of 10 sample summaries pass the agreed review checklist

## Out of scope
- Changes to the agency's ad accounts
- Reports for clients added after sign-off, quoted separately

## Milestones
| Milestone | Week | Amount |
|-----------|------|--------|
| Deposit | 0 | 1,800.00 |
| Pilot with 2 clients | 3 | 2,400.00 |
| Handover | 5 | 1,800.00 |
| Total | | 6,000.00 |

## Assumptions and risks
- The agency provides read-only API access to both ad platforms by week 1
- Risk: an ad platform rate-limits the nightly export. Mitigation: fetch incrementally, retry with backoff, and alert after two failed nights."""


@test("Builds the agency's proposal")
def _():
    assert build_proposal(HARBOUR) == EXPECTED


@test("Refuses a deliverable with no acceptance criteria")
def _():
    vague = {**HARBOUR, "deliverables": HARBOUR["deliverables"] + [{"title": "Better dashboards", "acceptance": []}]}
    raises(ValueError, build_proposal, vague, match="^'Better dashboards' has no acceptance criteria$")


@test("Lists every problem at once, in order")
def _():
    empty = {"title": "Draft", "goal": "  ", "deliverables": [], "out_of_scope": [], "total": 1000,
             "milestones": [("Deposit", 50, 0)], "assumptions": [], "risks": []}
    with raises(ValueError, what="build_proposal(empty)") as caught:
        build_proposal(empty)
    assert str(caught.value) == (
        "the goal is empty; there are no deliverables; nothing is listed as out of scope; "
        "milestones add up to 50%, not 100%; no risks are listed")


@test("A risk needs a mitigation")
def _():
    risky = {**HARBOUR, "risks": HARBOUR["risks"] + [{"risk": "the model misstates a figure", "mitigation": ""}]}
    raises(ValueError, build_proposal, risky, match="risk 'the model misstates a figure' has no mitigation")


@hidden("The last milestone takes the remainder, with thousands separators")
def _():
    odd = {**HARBOUR, "total": Decimal("12345.67"),
           "milestones": [("Deposit", 33, 0), ("Build", 33, 2), ("Handover", 34, 4)]}
    text = build_proposal(odd)
    assert "| Deposit | 0 | 4,074.07 |" in text
    assert "| Handover | 4 | 4,197.53 |" in text
    assert "| Total | | 12,345.67 |" in text


@hidden("The six sections come in the standard order")
def _():
    headings = [line for line in build_proposal(HARBOUR).splitlines() if line.startswith("## ")]
    assert headings == ["## Goal", "## Deliverables", "## Acceptance criteria", "## Out of scope",
                        "## Milestones", "## Assumptions and risks"]
