"""Acceptance tests for "Test a legacy module", run by GitHub Actions in your repository.

They copy your tests (test_pricing.py, and any other test files, conftest.py and tests/ folder
at the top of your repository) into a temporary folder and run them with pytest against several
versions of pricing.py: your own, a correctly fixed one, the original starter, and versions with
other bugs planted in them. They also check your pricing.py against the business rules, and read
BUGS.md. Tests marked xfail run as ordinary tests here (pytest --runxfail).

While your tests run, pricing.py can't reach the network (fetch_rate fails) or the real clock
(quote() fails without today), so a test that relies on either one fails.
"""

import base64
import functools
import os
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zlib
from dataclasses import dataclass, field
from pathlib import Path

# The module exactly as Fernhill runs it in production
ORIGINAL = r'''__STARTER__'''


def _unpack(blob: str) -> str:
    return zlib.decompress(base64.b64decode(blob)).decode("utf-8")


# A correctly fixed pricing.py, and our own checks of the business rules. They're kept encoded so
# the answers aren't in plain sight while you're still looking for the bugs.
FIXED = _unpack(
__FIXED__
)
RULES = _unpack(
__RULES__
)

# Further bugs planted in the fixed module, one at a time: (what it breaks, code, planted bug)
PLANTED = [
    ("a coupon used on its expiry date", "today > coupon.expires", "today >= coupon.expires"),
    ("a subtotal exactly at a coupon's minimum", "subtotal < coupon.minimum", "subtotal <= coupon.minimum"),
    ("goods of exactly 50.00 shipping free", "if goods >= FREE_SHIPPING_FROM:", "if goods > FREE_SHIPPING_FROM:"),
    (
        "VAT rounded to the penny",
        "vat = (taxable * VAT_RATE).quantize(PENNY, rounding=ROUND_HALF_UP)",
        'vat = (taxable * VAT_RATE).quantize(PENNY, rounding="ROUND_DOWN")',
    ),
    ("a quantity of 0 refused", "if quantity < 1:", "if quantity < 0:"),
    ("an unknown shipping region refused", "raise ValueError(f\"we don't ship to {region!r}\")", 'return SHIPPING["WORLD"]'),
    ("an unknown SKU in a cart refused", 'raise ValueError(f"unknown SKU: {sku}")', "continue"),
    ("a SKU that appears twice in the price list refused", "if sku in prices:", "if sku in prices and False:"),
    ("a negative price in the price list refused", "if price < 0:", "if price < 0 and False:"),
    ("spaces around a name in the price list removed", 'prices[sku] = (row["name"].strip(), price)', 'prices[sku] = (row["name"], price)'),
    ("the discount line printed only when there is a discount", "if q.discount:", "if True:"),
    ("free shipping printed as FREE", '"FREE" if q.shipping == 0', '"0.00" if q.shipping == 0'),
    (
        "the bulk discount rounded half-up",
        "total -= (total * BULK_DISCOUNT).quantize(PENNY, rounding=ROUND_HALF_UP)",
        'total -= (total * BULK_DISCOUNT).quantize(PENNY, rounding="ROUND_HALF_EVEN")',
    ),
]
PLANTED_TO_CATCH = 9

# While a suite runs, pricing.py can't reach the rates service or the real date
SANDBOX = [
    (
        "from urllib.request import urlopen",
        "def urlopen(*args, **kwargs):\n"
        '    raise RuntimeError("a test called the real rates service: replace fetch_rate in your tests")',
    ),
    (
        "today = today or date.today()",
        "if today is None:\n"
        '        raise RuntimeError("a test called quote() without today: pass the date in every test")',
    ),
]


@dataclass
class Run:
    """One run of a test suite: how many tests ran, and the ones that failed."""

    total: int = 0
    failed: list[str] = field(default_factory=list)
    messages: dict[str, str] = field(default_factory=dict)
    log: str = ""

    def describe(self, limit: int = 8) -> str:
        lines = [f"  {name}: {self.messages.get(name, '')}" for name in self.failed[:limit]]
        if len(self.failed) > limit:
            lines.append(f"  ... and {len(self.failed) - limit} more")
        return "\n".join(lines)


def sandboxed(source: str) -> str:
    for old, new in SANDBOX:
        source = source.replace(old, new, 1)
    return source


def one_bug(index: int) -> str:
    """The fixed module with just one of the original's bugs put back."""
    original, fixed = ORIGINAL.splitlines(), FIXED.splitlines()
    differences = [i for i, (a, b) in enumerate(zip(original, fixed)) if a != b]
    lines = list(fixed)
    lines[differences[index]] = original[differences[index]]
    return "\n".join(lines) + "\n"


def planted(index: int) -> str:
    _, old, new = PLANTED[index]
    assert FIXED.count(old) == 1, f"planted bug {index} doesn't apply"
    return FIXED.replace(old, new)


def your_test_files() -> list[Path]:
    """Your test files: test_*.py, *_test.py and conftest.py at the top, and a tests/ folder."""
    files = [
        path
        for path in Path(".").glob("*.py")
        if path.name.startswith("test_") or path.name.endswith("_test.py") or path.name == "conftest.py"
    ]
    if Path("tests").is_dir():
        files += [p for p in Path("tests").rglob("*") if p.is_file() and "__pycache__" not in p.parts]
    return files


def run_suite(pricing_source: str, tests: dict[str, bytes]) -> Run:
    """Run a suite against a pricing.py in a fresh temporary folder."""
    folder = Path(tempfile.mkdtemp(prefix="pylearn-pricing-"))
    try:
        for name, data in tests.items():
            (folder / name).parent.mkdir(parents=True, exist_ok=True)
            (folder / name).write_bytes(data)
        (folder / "pricing.py").write_text(sandboxed(pricing_source), encoding="utf-8")
        (folder / "pytest.ini").write_text("[pytest]\npythonpath = .\n", encoding="utf-8")
        result = subprocess.run(
            [sys.executable, "-m", "pytest", "-q", "-c", "pytest.ini", "--rootdir", ".", "-p", "no:cacheprovider",
             "--runxfail", "--junitxml", "report.xml"],
            cwd=folder,
            capture_output=True,
            text=True,
            timeout=180,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        run = Run(log=(result.stdout + result.stderr)[-2000:])
        report = folder / "report.xml"
        if report.exists():
            for case in ET.parse(report).getroot().iter("testcase"):
                run.total += 1
                for tag in ("failure", "error"):
                    node = case.find(tag)
                    if node is not None:
                        name = case.get("name", "")
                        run.failed.append(name)
                        message = (node.get("message") or node.text or "").strip().splitlines()
                        run.messages[name] = message[0][:200] if message else ""
                        break
        return run
    finally:
        shutil.rmtree(folder, ignore_errors=True)


@functools.cache
def your_suite_on(version: str) -> Run:
    """Your tests, run against one version of pricing.py."""
    assert Path("test_pricing.py").exists(), "test_pricing.py should be at the top of your repository"
    tests = {path.as_posix(): path.read_bytes() for path in your_test_files()}
    if version == "yours":
        assert Path("pricing.py").exists(), "pricing.py should be at the top of your repository"
        source = Path("pricing.py").read_text(encoding="utf-8")
    elif version == "fixed":
        source = FIXED
    elif version == "original":
        source = ORIGINAL
    elif version.startswith("bug"):
        source = one_bug(int(version[3:]))
    else:
        source = planted(int(version[7:]))
    run = run_suite(source, tests)
    assert run.total > 0, f"No tests ran. pytest said:\n{run.log}"
    return run


def caught(version: str) -> bool:
    """True if some test that passes on a correct pricing.py fails on this version."""
    return bool(set(your_suite_on(version).failed) - set(your_suite_on("fixed").failed))


def test_your_suite_passes_on_your_fixed_pricing_py():
    run = your_suite_on("yours")
    assert len(run.failed) == 0, (
        f"Against your pricing.py, {len(run.failed)} of your {run.total} tests fail. Once the bugs are fixed, "
        f"the whole suite should pass:\n{run.describe()}"
    )


def test_your_suite_passes_on_a_correct_pricing_py_without_network_or_clock():
    run = your_suite_on("fixed")
    assert len(run.failed) == 0, (
        f"Against a correctly fixed pricing.py, {len(run.failed)} of your tests fail. Check that each one follows "
        "the rules in the brief, replaces fetch_rate, and passes today to every quote:\n" + run.describe()
    )


def test_your_suite_fails_exactly_three_tests_on_the_original():
    run = your_suite_on("original")
    count = len(run.failed)
    assert count == 3, (
        f"Against the original pricing.py, your suite should fail exactly 3 tests, one for each bug. "
        f"It fails {count}" + (":\n" + run.describe() if run.failed else ".")
    )


def test_each_original_bug_is_caught():
    found = sum(1 for bug in range(3) if caught(f"bug{bug}"))
    assert found == 3, (
        f"Your suite catches {found} of the 3 bugs in the original pricing.py. With each bug on its own, at "
        "least one of your tests should fail. Keep testing the rules at their boundaries."
    )


def test_bugs_md_names_each_failing_test():
    assert Path("BUGS.md").exists(), "BUGS.md should be at the top of your repository"
    text = Path("BUGS.md").read_text(encoding="utf-8")
    failed = your_suite_on("original").failed
    assert failed, "Your suite doesn't fail any tests on the original pricing.py, so BUGS.md can't name them"
    missing = sorted({name.split("[")[0] for name in failed if name.split("[")[0] not in text})
    assert len(missing) == 0, f"BUGS.md should name each test that exposes a bug. It doesn't mention: {', '.join(missing)}"


def test_your_suite_catches_most_planted_bugs():
    missed = [PLANTED[i][0] for i in range(len(PLANTED)) if not caught(f"planted{i}")]
    found = len(PLANTED) - len(missed)
    assert found >= PLANTED_TO_CATCH, (
        f"We planted {len(PLANTED)} more bugs in a fixed pricing.py, one at a time, and your suite caught "
        f"{found}. Aim for at least {PLANTED_TO_CATCH}. No test noticed a change to:\n  " + "\n  ".join(missed)
    )


def test_your_pricing_py_follows_the_business_rules():
    assert Path("pricing.py").exists(), "pricing.py should be at the top of your repository"
    run = run_suite(Path("pricing.py").read_text(encoding="utf-8"), {"test_rules.py": RULES.encode("utf-8")})
    assert run.total > 0, f"Our checks couldn't run against your pricing.py:\n{run.log}"
    broken = len(run.failed)
    assert broken == 0, (
        f"Your pricing.py still breaks {broken} of our {run.total} checks of the business rules. "
        "Your own tests should find the problems: write the test from the rule, watch it fail, then fix the code."
    )


def test_your_suite_uses_the_toolkit():
    files = [p for p in your_test_files() if p.suffix == ".py"]
    assert Path("test_pricing.py").exists(), "test_pricing.py should be at the top of your repository"
    code = "\n".join(p.read_text(encoding="utf-8") for p in files)
    tools = {
        "fixtures (@pytest.fixture)": "pytest.fixture" in code,
        "parametrize": "parametrize" in code,
        "readable ids for parametrized cases (ids= or pytest.param(..., id=...))": "ids=" in code or "id=" in code,
        "pytest.raises": "pytest.raises" in code,
        "match= in pytest.raises": "match=" in code,
        "tmp_path": "tmp_path" in code,
        "capsys": "capsys" in code,
        "monkeypatch or patch for fetch_rate": "monkeypatch" in code or "patch(" in code,
    }
    missing = [tool for tool, used in tools.items() if not used]
    assert len(missing) == 0, "Your tests don't use: " + "; ".join(missing)
