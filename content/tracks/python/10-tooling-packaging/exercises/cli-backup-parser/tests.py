import contextlib
import io

from plp import test, hidden, raises
from solution import build_parser


def parse(argv):
    """Parse argv, turning an argparse exit into a readable failure."""
    errors = io.StringIO()
    try:
        with contextlib.redirect_stderr(errors):
            return build_parser().parse_args(argv)
    except SystemExit:
        last = (errors.getvalue().strip().splitlines() or ["(no message)"])[-1]
        raise AssertionError(f"parse_args({argv}) exited with: {last}") from None


@test("Parses the example")
def _():
    args = parse(["photos", "--dry-run", "-k", "3"])
    assert (args.source, args.dest, args.dry_run, args.keep) == ("photos", "backups", True, 3)


@test("Has the right defaults")
def _():
    assert vars(parse(["photos"])) == {"source": "photos", "dest": "backups", "dry_run": False, "keep": 7}


@test("Accepts every option, long or short, in any order")
def _():
    assert vars(parse(["--keep", "30", "--dest", "/mnt/nas/backups", "invoices"])) == {
        "source": "invoices",
        "dest": "/mnt/nas/backups",
        "dry_run": False,
        "keep": 30,
    }


@hidden("A missing source is a usage error")
def _():
    with raises(SystemExit) as caught, contextlib.redirect_stderr(io.StringIO()):
        build_parser().parse_args([])
    assert caught.value.code == 2


@hidden("keep must be a whole number")
def _():
    with raises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
        build_parser().parse_args(["photos", "--keep", "many"])
