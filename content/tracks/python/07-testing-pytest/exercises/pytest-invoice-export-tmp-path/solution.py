from decimal import Decimal

import pytest

from export import export_invoices

INVOICES = [
    {"number": "INV-1042", "customer": "Millstone Coffee", "total": Decimal("12.5")},
    {"number": "INV-1043", "customer": "Harbour Books", "total": Decimal("249.99")},
]


@pytest.fixture
def target(tmp_path):
    return tmp_path / "invoices.csv"


def test_returns_the_number_of_invoices(target):
    assert export_invoices(INVOICES, target) == 2


def test_writes_a_header_and_one_row_per_invoice(target):
    export_invoices(INVOICES, target)
    assert target.read_text(encoding="utf-8").splitlines() == [
        "number,customer,total",
        "INV-1042,Millstone Coffee,12.50",
        "INV-1043,Harbour Books,249.99",
    ]


def test_refuses_to_replace_an_existing_file(target):
    target.write_text("keep me")
    with pytest.raises(FileExistsError):
        export_invoices(INVOICES, target)
    assert target.read_text() == "keep me"


def test_overwrite_replaces_the_file(target):
    target.write_text("old export")
    export_invoices(INVOICES, target, overwrite=True)
    assert target.read_text(encoding="utf-8").startswith("number,customer,total")
