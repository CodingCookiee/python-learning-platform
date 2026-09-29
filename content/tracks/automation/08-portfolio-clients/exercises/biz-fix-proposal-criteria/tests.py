from plp import hidden, raises, test
from solution import render_deliverables

REPORT = {"title": "Daily sales report",
          "acceptance": ["Arrives by 08:00 on 20 working days in a row",
                         "Totals match the till export to the cent"]}
ALERT = {"title": "Low-stock alert",
         "acceptance": ["Posts in Slack within 5 minutes of stock falling below the reorder level"]}


@test("Every deliverable is followed by its own acceptance criteria")
def _():
    assert render_deliverables([REPORT, ALERT]) == (
        "## Deliverables\n"
        "\n"
        "1. Daily sales report\n"
        "   Accepted when:\n"
        "   - Arrives by 08:00 on 20 working days in a row\n"
        "   - Totals match the till export to the cent\n"
        "2. Low-stock alert\n"
        "   Accepted when:\n"
        "   - Posts in Slack within 5 minutes of stock falling below the reorder level"
    )


@test("Refuses a deliverable with no acceptance criteria")
def _():
    vague = {"title": "Better customer emails", "acceptance": []}
    raises(ValueError, render_deliverables, [REPORT, vague], match="'Better customer emails' has no acceptance criteria")


@test("One deliverable renders on its own")
def _():
    assert render_deliverables([ALERT]).splitlines() == [
        "## Deliverables",
        "",
        "1. Low-stock alert",
        "   Accepted when:",
        "   - Posts in Slack within 5 minutes of stock falling below the reorder level",
    ]


@hidden("The count of 'Accepted when' blocks matches the deliverables")
def _():
    third = {"title": "Weekly refund summary", "acceptance": ["Emailed every Monday by 09:00"]}
    text = render_deliverables([REPORT, ALERT, third])
    assert text.count("Accepted when:") == 3
    assert text.index("3. Weekly refund summary") < text.index("   - Emailed every Monday by 09:00")
