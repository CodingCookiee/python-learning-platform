from decimal import Decimal

import pytest

from report import read_report_total, write_daily_report

SALES = [("Mug", 2, "8.00"), ("Tea", 3, "3.50")]


@pytest.fixture
def report(tmp_path):
    path = tmp_path / "daily_report.csv"
    write_daily_report(SALES, path)
    return path


def test_write_report_creates_the_file(report):
    assert report.exists()


def test_report_starts_with_a_header(report):
    assert report.read_text().splitlines()[0] == "item,quantity,unit_price,line_total"


def test_report_total_adds_up_the_lines(report):
    assert read_report_total(report) == Decimal("26.50")
