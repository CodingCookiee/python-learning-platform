"""Checks for the "CLI with subcommands and tests" lab, run by GitHub Actions in your repository.

Your CLI can be cli.py at the top of the repository or invoicer/cli.py inside a package; either way it
needs build_parser() and main(argv=None) as in the lesson.
"""

import contextlib
import importlib
import io
import subprocess
import sys
from pathlib import Path

import pytest


def cli():
    for name in ("cli", "invoicer.cli"):
        with contextlib.suppress(ModuleNotFoundError):
            return importlib.import_module(name)
    pytest.fail("No CLI module: create cli.py (or invoicer/cli.py) with build_parser() and main()")


def run_main(*argv: str) -> tuple[int, str, str]:
    """Call main(argv) and return (exit code, stdout, stderr), counting SystemExit as an exit."""
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            code = cli().main(list(argv))
        except SystemExit as exc:
            code = exc.code
    return (0 if code is None else int(code)), out.getvalue(), err.getvalue()


def test_it_has_build_parser_and_main():
    module = cli()
    assert callable(getattr(module, "build_parser", None)), "Define build_parser() returning the ArgumentParser"
    assert callable(getattr(module, "main", None)), "Define main(argv=None)"


def test_help_lists_both_subcommands():
    code, out, _ = run_main("--help")
    assert code == 0, "--help should exit with status 0"
    assert "report" in out and "send" in out, f"--help should list the report and send subcommands:\n{out}"


def test_a_subcommand_is_required():
    code, _, err = run_main()
    assert code == 2, "Running with no subcommand should be a usage error (exit status 2)"
    assert "usage:" in err, "argparse should print the usage line on the error"


def test_report_takes_a_path():
    args = cli().build_parser().parse_args(["report", "invoices.csv"])
    assert getattr(args, "path", None) == "invoices.csv", "report should take a path argument"


def test_send_has_a_dry_run_flag():
    parser = cli().build_parser()
    assert parser.parse_args(["send", "--dry-run"]).dry_run is True
    assert parser.parse_args(["send"]).dry_run is False


def test_subcommands_route_to_handlers():
    args = cli().build_parser().parse_args(["send", "--dry-run"])
    assert callable(getattr(args, "handler", None)), "Use set_defaults(handler=...) on each subcommand"


def test_verbose_counts():
    parser = cli().build_parser()
    for argv in (["-vv", "send"], ["send", "-vv"]):
        try:
            args = parser.parse_args(argv)
        except SystemExit:
            continue
        assert args.verbose == 2, "-v/--verbose should count (action='count')"
        return
    pytest.fail("Add a -v/--verbose option with action='count'")


def test_your_own_tests_pass():
    assert Path("tests").is_dir(), "Put your tests in a tests/ folder"
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests", "-q", "-p", "no:cacheprovider"], capture_output=True, text=True, timeout=180
    )
    assert result.returncode == 0, f"Your tests in tests/ don't all pass:\n{result.stdout[-2000:]}"
    assert " passed" in result.stdout, "No tests ran from tests/"
