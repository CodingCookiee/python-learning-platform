from decimal import Decimal

import pytest

from export import export_invoices

INVOICES = [
    {"number": "INV-1042", "customer": "Millstone Coffee", "total": Decimal("12.5")},
    {"number": "INV-1043", "customer": "Harbour Books", "total": Decimal("249.99")},
]


def test_returns_the_number_of_invoices(tmp_path):
    assert export_invoices(INVOICES, tmp_path / "invoices.csv") == 2


# Check what's in the file, and what happens when it already exists
