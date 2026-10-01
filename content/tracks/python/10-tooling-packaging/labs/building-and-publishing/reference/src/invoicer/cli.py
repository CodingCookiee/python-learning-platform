import argparse
import logging
import sys
from collections.abc import Sequence


def level_for(verbose: int) -> int:
    return [logging.WARNING, logging.INFO, logging.DEBUG][min(verbose, 2)]


def report(args: argparse.Namespace) -> int:
    if not args.path.endswith(".csv"):
        print(f"invoicer: error: {args.path} isn't a CSV file", file=sys.stderr)
        return 1
    print(f"Reporting on {args.path} in {args.currency}")
    return 0


def send(args: argparse.Namespace) -> int:
    print("Sending reminders" + (" (dry run)" if args.dry_run else ""))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="invoicer", description="Invoice tools.")
    parser.add_argument("-v", "--verbose", action="count", default=0, help="say more; repeat for even more")
    commands = parser.add_subparsers(dest="command", required=True)

    report_parser = commands.add_parser("report", help="summarise an export")
    report_parser.add_argument("path", help="CSV export to read")
    report_parser.add_argument("--currency", default="EUR", choices=["EUR", "GBP", "USD"])
    report_parser.set_defaults(handler=report)

    send_parser = commands.add_parser("send", help="email unpaid invoices")
    send_parser.add_argument("--dry-run", action="store_true", help="show what would be sent")
    send_parser.set_defaults(handler=send)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(level=level_for(args.verbose))
    return int(args.handler(args))


if __name__ == "__main__":
    raise SystemExit(main())
