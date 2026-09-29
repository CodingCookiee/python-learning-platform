import argparse
from decimal import Decimal


def parse_month(text):
    """ "2026-09" -> (2026, 9). Raise argparse.ArgumentTypeError for anything else."""
    year, dash, month = text.partition("-")
    if dash and year.isdigit() and month.isdigit() and 1 <= int(month) <= 12:
        return int(year), int(month)
    raise argparse.ArgumentTypeError(f"{text} isn't a month; use YYYY-MM")


def build_parser():
    """The parser for: report MONTH [--format FORMAT] [--limit LIMIT] [--min-total MIN_TOTAL]"""
    parser = argparse.ArgumentParser(
        prog="report",
        description="Summarise one month of invoices.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("month", type=parse_month, help="the month to report on, as YYYY-MM")
    parser.add_argument("--format", choices=["table", "csv", "json"], default="table", help="output format")
    parser.add_argument("--limit", type=int, default=10, help="how many customers to list")
    parser.add_argument("--min-total", type=Decimal, default=Decimal("0"), help="skip invoices below this amount")
    return parser
