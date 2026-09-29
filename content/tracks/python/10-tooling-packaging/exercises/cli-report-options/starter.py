import argparse
from decimal import Decimal


def parse_month(text):
    """ "2026-09" -> (2026, 9). Raise argparse.ArgumentTypeError for anything else."""
    ...


def build_parser():
    """The parser for: report MONTH [--format FORMAT] [--limit LIMIT] [--min-total MIN_TOTAL]"""
    parser = argparse.ArgumentParser(prog="report", description="Summarise one month of invoices.")
    parser.add_argument("month")
    return parser
