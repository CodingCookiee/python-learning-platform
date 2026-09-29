from plp import hidden, test
from solution import REQUIRED, missing_sections

DRAFT = """# Monthly reports for Northfold Outdoor

## Goal
Clients get their monthly report on the 1st, without anyone building it.

## Deliverables
1. An automated report for each client

## Milestones
Deposit, pilot, handover.
"""


@test("Finds the three sections the draft is missing")
def _():
    assert missing_sections(DRAFT) == ["Acceptance criteria", "Out of scope", "Assumptions and risks"]


@test("A complete SOW is missing nothing")
def _():
    complete = "\n\n".join(f"## {name}\nText." for name in REQUIRED)
    assert missing_sections(complete) == []


@test("An empty document is missing everything")
def _():
    assert missing_sections("") == REQUIRED


@hidden("Case and surrounding spaces don't matter")
def _():
    doc = "## GOAL  \n## deliverables\n##   Out of Scope\n"
    assert missing_sections(doc) == ["Acceptance criteria", "Milestones", "Assumptions and risks"]


@hidden("Only level-2 headings count, not ### or text that mentions the name")
def _():
    doc = "### Goal\nThe goal is clear.\n# Deliverables\n## Milestones\n"
    assert missing_sections(doc) == [
        "Goal", "Deliverables", "Acceptance criteria", "Out of scope", "Assumptions and risks"]
