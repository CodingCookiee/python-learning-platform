"""Acceptance tests for "Make it fast", run by GitHub Actions in your repository.

They import report.py from the top of your repository and compare your build_report with
the starter's (original_report.py, next to this file) on data from the starter's
make_sample: the default sample, other sizes and seeds, and two calls in a row. They time
both versions on the same machine, check the files you hand in, and run your tests.
"""

import ast
import importlib.util
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

HERE = Path(__file__).parent
PROGRAM = Path("report.py")
SPEED_UP = 15


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def text(path):
    """A text file's contents with Windows line endings made plain."""
    return Path(path).read_text(encoding="utf-8").replace("\r\n", "\n")


@pytest.fixture(scope="module")
def original():
    return load(HERE / "original_report.py", "original_report_for_acceptance")


@pytest.fixture(scope="module")
def fast():
    assert PROGRAM.exists(), "report.py should be at the top of your repository"
    # Loaded by path: the test runner has a report.py of its own next to these tests
    return load(PROGRAM.resolve(), "learners_report")


@pytest.fixture(scope="module")
def thousand(original):
    """The 1,000-order sample, the starter's report for it, and how long the starter took."""
    data = original.make_sample(1000)
    start = time.perf_counter()
    report = original.build_report(*data)
    return data, report, time.perf_counter() - start


def test_the_default_sample_matches_the_starter(original, fast):
    data = original.make_sample()
    assert fast.build_report(*data) == text(HERE / "expected-5000.txt"), (
        "build_report's text differs from the starter's on the default sample"
    )


def test_other_sizes_and_seeds_match_the_starter(original, fast, thousand):
    data, expected, _ = thousand
    assert fast.build_report(*data) == expected, "The 1,000-order report differs from the starter's"
    for orders, seed in [(50, 1), (137, 42), (300, 7), (640, 99)]:
        data = original.make_sample(orders, seed=seed)
        assert fast.build_report(*data) == original.build_report(*data), (
            f"The report for make_sample({orders}, seed={seed}) differs from the starter's"
        )


def test_nothing_is_carried_over_between_calls(original, fast):
    first = original.make_sample(200, seed=8)
    second = original.make_sample(200, seed=9)
    assert fast.build_report(*first) == original.build_report(*first)
    assert fast.build_report(*second) == original.build_report(*second), (
        "The second call's report is wrong: is a cache from the first call still full?"
    )
    assert fast.build_report(*first) == original.build_report(*first)


def test_it_is_much_faster_than_the_starter(fast, thousand):
    data, _, slow = thousand
    runs = []
    for _ in range(5):
        start = time.perf_counter()
        fast.build_report(*data)
        runs.append(time.perf_counter() - start)
    ratio = slow / min(runs)
    assert ratio >= SPEED_UP, (
        f"On 1,000 orders the starter took {slow:.2f} s and yours {min(runs):.3f} s: {ratio:.1f} times faster. "
        f"This test needs at least {SPEED_UP} times on this machine"
    )


def test_make_sample_main_and_the_flags_are_unchanged(original, fast):
    assert fast.make_sample(300, seed=5) == original.make_sample(300, seed=5), "make_sample has changed"
    result = subprocess.run([sys.executable, str(PROGRAM), "--orders", "300"], capture_output=True, text=True, timeout=120)
    assert result.returncode == 0, f"python report.py --orders 300 crashed:\n{result.stderr[-1500:]}"
    assert result.stdout.replace("\r\n", "\n") == original.build_report(*original.make_sample(300))
    timed = subprocess.run(
        [sys.executable, str(PROGRAM), "--orders", "300", "--time", "--repeat", "3"],
        capture_output=True, text=True, timeout=120,
    )
    assert timed.returncode == 0 and timed.stderr.startswith("build_report: best of 3: "), (
        f"--time --repeat 3 should print the timing line on stderr, got {timed.stderr[-500:]!r}"
    )
    assert timed.stdout == result.stdout, "--time must not change what goes to stdout"


def test_standard_library_only():
    assert PROGRAM.exists(), "report.py should be at the top of your repository"
    tree = ast.parse(PROGRAM.read_text(encoding="utf-8"))
    imported = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported |= {alias.name.split(".")[0] for alias in node.names}
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            imported.add(node.module.split(".")[0])
    outside = sorted(name for name in imported if name not in sys.stdlib_module_names and not Path(f"{name}.py").exists())
    assert not outside, f"report.py imports {', '.join(outside)}: only the standard library is allowed"


def test_the_starter_and_its_outputs_are_saved(original, thousand):
    for name in ("report_original.py", "expected.txt", "expected-1000.txt"):
        assert Path(name).exists(), f"{name} should be at the top of your repository"
    assert text("expected.txt") == text(HERE / "expected-5000.txt"), "expected.txt isn't the starter's output"
    assert text("expected-1000.txt") == thousand[1], "expected-1000.txt isn't the starter's output for --orders 1000"
    copy = load(Path("report_original.py").resolve(), "learners_report_original")
    small = original.make_sample(100, seed=3)
    assert copy.build_report(*small) == original.build_report(*small), "report_original.py should be the starter"


def test_the_profiles_and_notes_are_there():
    for name in ("before-profile.txt", "after-profile.txt", "NOTES.md"):
        assert Path(name).exists(), f"{name} should be at the top of your repository"
    before, after = text("before-profile.txt"), text("after-profile.txt")
    for name, profile in (("before-profile.txt", before), ("after-profile.txt", after)):
        assert "tottime" in profile and "ncalls" in profile, f"{name} should hold pstats output sorted by tottime"
    assert before != after, "before-profile.txt and after-profile.txt are the same"
    assert "|" in text("NOTES.md"), "NOTES.md should have a table of your changes and their times"


def test_your_own_tests_pass(tmp_path):
    assert Path("test_report.py").exists(), "test_report.py should be at the top of your repository"
    report = tmp_path / "report.xml"
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "test_report.py", "-q", "-p", "no:cacheprovider", f"--junitxml={report}"],
        capture_output=True, text=True, timeout=240,
    )
    assert report.exists(), f"Your tests didn't run:\n{result.stdout[-1500:]}{result.stderr[-1500:]}"
    cases = list(ET.parse(report).getroot().iter("testcase"))
    failed = [c.get("name") for c in cases if c.find("failure") is not None or c.find("error") is not None]
    assert cases and not failed, f"These tests in test_report.py fail: {failed[:5]}\n{result.stdout[-1500:]}"
