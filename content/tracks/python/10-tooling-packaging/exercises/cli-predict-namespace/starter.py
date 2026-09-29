import argparse

parser = argparse.ArgumentParser(prog="deploy")
parser.add_argument("service")
parser.add_argument("--region", default="eu-west-1")
parser.add_argument("--dry-run", action="store_true")
parser.add_argument("--retries", type=int, default="3")
parser.add_argument("--tag", action="append")
parser.add_argument("-v", "--verbose", action="count", default=0)

args = parser.parse_args(["billing-api", "-vv", "--tag", "v1.4.0", "--retries", "5", "--tag", "stable"])
print(args.service, args.region, args.dry_run)
print(args.retries + 1, args.tag, args.verbose)

args = parser.parse_args(["--dry-run", "invoicer"])
print(args.service, args.dry_run, args.retries, type(args.retries).__name__)
print(args.tag, args.verbose)
