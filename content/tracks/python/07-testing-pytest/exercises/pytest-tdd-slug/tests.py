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


MODULE, TEST_FILE = "slug.py", "test_slug.py"

LEARNER_SLUG = plp.learner_files().get("slug.py", "")

CORRECT = '''
import re


def slugify(title, max_length=40):
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    if len(slug) > max_length:
        head = slug[: max_length + 1]
        slug = head.rsplit("-", 1)[0] if "-" in head else slug[:max_length]
    return slug or "untitled"
'''

HYPHEN_PER_CHARACTER = planted('r"[^a-z0-9]+"', 'r"[^a-z0-9]"')
KEEPS_END_HYPHENS = planted('.strip("-")', "")
CUTS_MID_WORD = planted('head.rsplit("-", 1)[0] if "-" in head else slug[:max_length]', "slug[:max_length]")
NO_FALLBACK = planted('return slug or "untitled"', "return slug")


def slugify(*args, **kwargs):
    """The learner's slugify, from their slug.py."""
    import slug

    return slug.slugify(*args, **kwargs)


def expect(title, wanted, **kwargs):
    call = f"slugify({title!r}{''.join(f', {k}={v!r}' for k, v in kwargs.items())})"
    got = slugify(title, **kwargs)
    assert got == wanted, f"{call} returned {got!r}; the ticket says {wanted!r}"


@test("Your tests pass on your slug.py")
def _():
    result = run(LEARNER_SLUG)
    assert result.total > 0, "pytest didn't collect any tests. Name each test function test_something."
    assert not result.errors, "pytest couldn't run some of your tests:\n" + report(result)
    assert not result.failed, (
        "Some of your tests fail on your own slug.py. Make them pass before you write the next one "
        "(that's the green step):\n" + report(result)
    )


@test("A test for every rule: at least four")
def _():
    count = len(run(LEARNER_SLUG).passed)
    assert count >= 4, f"You have {count} passing test(s). Write one (at least) for each of the four rules."


@test("slugify turns each run of other characters into one hyphen")
def _():
    expect("Hello, World!", "hello-world")
    expect("Python 3.13 -- what's new", "python-3-13-what-s-new")


@test("slugify leaves no hyphens at the ends")
def _():
    expect("  ...Python 3.13?  ", "python-3-13")


@test("slugify keeps as many whole words as fit")
def _():
    expect("ten tips for writing tests", "ten-tips-for", max_length=15)
    expect("ten tips for writing tests", "ten-tips-for-writing", max_length=20)
    expect("a" * 50, "a" * 40)


@test("slugify gives untitled when nothing is usable")
def _():
    expect("!!!", "untitled")
    expect("", "untitled")


@hidden("slugify leaves a slug within the limit alone")
def _():
    expect("short title", "short-title", max_length=11)
    expect("Testing with pytest", "testing-with-pytest")


@test("Your tests pass on a correct slugify")
def _():
    result = run(CORRECT)
    assert not result.errors and not result.failed, (
        "These tests fail on a slugify that follows the ticket, so they test something the ticket "
        "doesn't ask for:\n" + report(result)
    )


@test("Catches leftover hyphens at the ends")
def _():
    assert catches(KEEPS_END_HYPHENS), (
        "A bug slipped through: slugify left a hyphen at the start or end, and your tests all "
        "passed. Test a title that starts or ends with spaces or punctuation."
    )


@hidden("Catches one hyphen per character instead of per run")
def _():
    assert catches(HYPHEN_PER_CHARACTER), (
        "A bug slipped through: \"Hello, World!\" became \"hello--world\", and your tests all passed. "
        "Test a title with two or more separators in a row."
    )


@hidden("Catches a long slug being cut mid-word")
def _():
    assert catches(CUTS_MID_WORD), (
        "A bug slipped through: long slugs were cut at exactly max_length, mid-word, and your tests "
        "all passed. Test a title whose limit falls inside a word."
    )


@hidden("Catches an empty slug instead of untitled")
def _():
    assert catches(NO_FALLBACK), (
        "A bug slipped through: a title of only punctuation gave \"\" instead of \"untitled\", and "
        "your tests all passed."
    )
