from decimal import Decimal
from pathlib import Path

from report import read_report_total, write_daily_report

REPORT = Path("daily_report.csv")
SALES = [("Mug", 2, "8.00"), ("Tea", 3, "3.50")]


def test_write_report_creates_the_file():
    write_daily_report(SALES, REPORT)
    assert REPORT.exists()


def test_report_starts_with_a_header():
    assert REPORT.read_text().splitlines()[0] == "item,quantity,unit_price,line_total"


def test_report_total_adds_up_the_lines():
    assert read_report_total(REPORT) == Decimal("26.50")
