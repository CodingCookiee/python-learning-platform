import ast
import re
from functools import cache

import plp
from plp import defined_names, pytest_run, solution_source, source_avoids, source_uses


# Each check runs pytest, which takes a few seconds (the first run imports it). The per-test
# limit only watches tests.py itself here, so it's switched off; the drill's timeout still applies.
def test(name):
    return plp.test(name, timeout=None)


def hidden(name):
    return plp.hidden(name, timeout=None)


SUPPORT = {}  # extra files pytest needs (a conftest.py, other modules)


@cache
def run(module_source):
    """Run the learner's tests with pytest against one version of the module under test."""
    return pytest_run({**SUPPORT, MODULE: module_source, TEST_FILE: solution_source()})


def planted(old, new, source=None):
    """A copy of the correct module with one bug planted in it."""
    source = CORRECT if source is None else source
    assert old in source, f"mutant doesn't apply: {old!r}"
    return source.replace(old, new)


def report(result):
    """pytest's own explanation of each failure: the E lines under each test's heading."""
    out, heading, shown = [], None, 0
    for line in result.output.splitlines():
        match = re.fullmatch(r"_{2,} (.+?) _{2,}", line)
        if match:
            heading, shown = match.group(1), 0
        elif line.startswith("E ") and heading and shown < 3:
            if shown == 0:
                out.append(heading + ":")
            out.append("    " + line[1:].strip().removeprefix("AssertionError: "))
            shown += 1
        elif "short test summary" in line:
            break
    return "\n".join(out[:15])


def clean(result):
    return result.total > 0 and not result.failed and not result.errors


def catches(buggy_source):
    """True if the learner's tests fail (or error) on the buggy copy."""
    assert clean(run(CORRECT)), "Make your tests pass cleanly on the correct code first (see the checks above)"
    result = run(buggy_source)
    return bool(result.failed or result.errors)


def passes_on_correct():
    result = run(CORRECT)
    assert result.total > 0, "pytest didn't collect any tests. Name each test function test_something."
    assert result.errors == [], "pytest couldn't run some of your tests:\n" + report(result)
    assert result.failed == [], (
        "These fail on the correct code, so they expect the wrong thing:\n" + report(result)
    )

import os

MODULE, TEST_FILE = "config.py", "test_config.py"

CORRECT = '''
import os

MODES = ("sandbox", "live")


def payments_mode():
    """Which payment environment to use, from the PAYMENTS_MODE environment variable.

    Case and surrounding spaces don't matter. Unset means "sandbox", the safe choice.
    Any other value raises ValueError, so a typo can't silently pick a mode.
    """
    mode = os.environ.get("PAYMENTS_MODE", "sandbox").strip().lower()
    if mode not in MODES:
        raise ValueError(f"PAYMENTS_MODE must be sandbox or live, not {mode!r}")
    return mode
'''

DEFAULTS_TO_LIVE = planted('os.environ.get("PAYMENTS_MODE", "sandbox")', 'os.environ.get("PAYMENTS_MODE", "live")')
CASE_SENSITIVE = planted(".strip().lower()", ".strip()")
TYPO_FALLS_BACK = planted(
    '        raise ValueError(f"PAYMENTS_MODE must be sandbox or live, not {mode!r}")',
    '        return "sandbox"',
)


@cache
def run(module_source):
    os.environ.pop("PAYMENTS_MODE", None)  # every run starts from the same environment
    return pytest_run({MODULE: module_source, TEST_FILE: solution_source()})


@test("Your tests pass on the correct config.py")
def _():
    passes_on_correct()


@test("Uses monkeypatch, and leaves the environment as it found it")
def _():
    assert source_uses(name="monkeypatch"), "Set the variable with the monkeypatch fixture"
    run(CORRECT)
    leftover = os.environ.get("PAYMENTS_MODE")
    assert leftover is None, (
        f"PAYMENTS_MODE was still set to {leftover!r} after your tests ran. Set it with "
        "monkeypatch.setenv, which undoes the change when the test ends."
    )


@test("Catches live payments being the default")
def _():
    assert catches(DEFAULTS_TO_LIVE), (
        "A bug slipped through: with PAYMENTS_MODE unset, payments_mode() returned \"live\", and "
        "all your tests still passed. Test the default with the variable removed."
    )


@hidden("Catches capitals being refused")
def _():
    assert catches(CASE_SENSITIVE), (
        "A bug slipped through: PAYMENTS_MODE=\"LIVE\" raised ValueError instead of meaning live, "
        "and all your tests still passed."
    )


@hidden("Catches a typo silently falling back to sandbox")
def _():
    assert catches(TYPO_FALLS_BACK), (
        "A bug slipped through: a misspelt mode quietly became \"sandbox\" instead of raising "
        "ValueError, and all your tests still passed."
    )
