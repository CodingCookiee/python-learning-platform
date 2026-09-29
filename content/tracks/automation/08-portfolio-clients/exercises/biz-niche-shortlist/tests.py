from decimal import Decimal

from plp import hidden, test
from solution import niche_shortlist


def note(client, industry, process, value):
    return {"client": client, "industry": industry, "process": process, "monthly_value": Decimal(value)}


# EXAMPLE notes, invented for practice
NOTES = [
    note("Brightsmile Dental", "Dental", "Recall reminders", "640"),
    note("Harbour Road Dental", "dental", "recall reminders ", "520"),
    note("Kensal Smiles", "Dental", "Recall reminders", "700"),
    note("Kensal Smiles", "Dental", "Insurance claims", "480"),
    note("Petal & Pine", "Ecommerce", "Order status emails", "900"),
    note("Northfold Outdoor", "ecommerce", "Order status emails", "1200"),
    note("Lumen Lamps", "Ecommerce", "Order status emails", "450"),
    note("Lumen Lamps", "Ecommerce", "Review requests", "150"),
    note("Okafor Logistics", "Logistics", "Delivery exceptions", "1600"),
]


@test("Finds the two niches in the notes")
def _():
    assert niche_shortlist(NOTES) == [
        {"industry": "ecommerce", "process": "order status emails", "clients": 3, "median_value": Decimal("900")},
        {"industry": "dental", "process": "recall reminders", "clients": 3, "median_value": Decimal("640")},
    ]


@test("min_clients sets the bar")
def _():
    result = niche_shortlist(NOTES, min_clients=4)
    assert result == []
    assert len(niche_shortlist(NOTES, min_clients=1)) == 5


@test("More clients comes before a higher median")
def _():
    extra = NOTES + [note("Canal Street Dental", "Dental", "Recall reminders", "300")]
    result = niche_shortlist(extra)
    assert [row["industry"] for row in result] == ["dental", "ecommerce"]
    assert result[0]["clients"] == 4


@hidden("A client noted twice counts once, with its higher value")
def _():
    notes = [
        note("Brightsmile Dental", "Dental", "Recall reminders", "400"),
        note(" brightsmile dental", "Dental", "Recall reminders", "800"),
        note("Harbour Road Dental", "Dental", "Recall reminders", "600"),
    ]
    assert niche_shortlist(notes, min_clients=2) == [
        {"industry": "dental", "process": "recall reminders", "clients": 2, "median_value": Decimal("700")},
    ]


@hidden("Equal counts are ordered by median value, highest first")
def _():
    notes = [
        note("A1 Physio", "Physio", "No-show follow-ups", "300"),
        note("Core Physio", "Physio", "No-show follow-ups", "500"),
        note("Petal & Pine", "Ecommerce", "Returns", "900"),
        note("Lumen Lamps", "Ecommerce", "Returns", "700"),
    ]
    assert [row["process"] for row in niche_shortlist(notes, min_clients=2)] == ["returns", "no-show follow-ups"]
