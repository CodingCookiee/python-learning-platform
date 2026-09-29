import argparse
import re
import sys


def slugify(title, separator="-"):
    words = re.findall(r"[a-z0-9]+", title.lower())
    return separator.join(words)


def build_parser():
    parser = argparse.ArgumentParser(prog="slug", description="Turn titles into URL slugs.")
    parser.add_argument("titles", nargs="+", help="titles to convert")
    parser.add_argument("--separator", default="-", help="text between words (default: %(default)s)")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    status = 0
    for title in args.titles:
        slug = slugify(title, args.separator)
        if not slug:
            print(f"slug: error: {title!r} has no letters or digits", file=sys.stderr)
            status = 1
            continue
        print(slug)
    return status


if __name__ == "__main__":
    raise SystemExit(main())
