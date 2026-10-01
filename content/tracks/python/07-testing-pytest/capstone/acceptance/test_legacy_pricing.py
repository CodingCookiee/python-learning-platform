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
ORIGINAL = r'''"""Order pricing for Fernhill Tea's web shop.

Written by a contractor in 2021, in production ever since, and never tested.
Every basket on the site is priced by quote(). Prices in the price list exclude VAT.

    prices = load_price_list("prices.csv")
    print_quote(quote({"EB-250": 2, "MUG-01": 1}, prices, "UK"))
"""

import csv
import json
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from urllib.request import urlopen

PENNY = Decimal("0.01")
VAT_RATE = Decimal("0.20")
BULK_QUANTITY = 10  # this many of one product or more...
BULK_DISCOUNT = Decimal("0.05")  # ...takes 5% off that line
FREE_SHIPPING_FROM = Decimal("50.00")
SHIPPING = {"UK": Decimal("3.95"), "EU": Decimal("7.50"), "WORLD": Decimal("14.00")}
RATES_URL = "https://rates.fernhill.example/latest?base=GBP&symbols={currency}"


@dataclass(frozen=True)
class Coupon:
    code: str
    percent: int  # 10 means 10% off the goods
    expires: date  # the last day it can be used
    minimum: Decimal = Decimal("0")  # the goods subtotal needed to use it


@dataclass(frozen=True)
class Quote:
    subtotal: Decimal
    discount: Decimal
    shipping: Decimal
    vat: Decimal
    total: Decimal


def load_price_list(path):
    """Read a sku,name,price CSV file into {sku: (name, price)}.

    Blank lines are skipped. A missing or negative price, or a SKU that appears
    twice, raises ValueError naming the line it's on.
    """
    prices = {}
    with open(path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            sku = row["sku"].strip()
            if sku in prices:
                raise ValueError(f"line {reader.line_num}: {sku} appears twice")
            try:
                price = Decimal(row["price"])
            except (InvalidOperation, TypeError):
                raise ValueError(f"line {reader.line_num}: {sku} has no valid price") from None
            if price < 0:
                raise ValueError(f"line {reader.line_num}: {sku} has a negative price")
            prices[sku] = (row["name"].strip(), price)
    return prices


def line_total(unit_price, quantity):
    """The price of one line. 10 or more of one product take 5% off the line,
    rounded half-up to the penny."""
    if quantity < 1:
        raise ValueError(f"quantity must be at least 1, got {quantity}")
    total = unit_price * quantity
    if quantity > BULK_QUANTITY:
        total -= (total * BULK_DISCOUNT).quantize(PENNY, rounding=ROUND_HALF_UP)
    return total


def goods_subtotal(cart, prices):
    """The total of a cart ({sku: quantity}), priced from the price list."""
    subtotal = Decimal("0.00")
    for sku, quantity in cart.items():
        if sku not in prices:
            raise ValueError(f"unknown SKU: {sku}")
        _, unit_price = prices[sku]
        subtotal += line_total(unit_price, quantity)
    return subtotal


def coupon_discount(coupon, subtotal, today):
    """What a coupon takes off the goods subtotal, rounded half-up to the penny.

    Nothing if there's no coupon, if it has expired, or if the subtotal is below
    its minimum.
    """
    if coupon is None or today > coupon.expires or subtotal < coupon.minimum:
        return Decimal("0.00")
    return (subtotal * coupon.percent / 100).quantize(PENNY)


def shipping_cost(goods, region):
    """Shipping to a region: free when the goods come to 50.00 or more."""
    if region not in SHIPPING:
        raise ValueError(f"we don't ship to {region!r}")
    if goods >= FREE_SHIPPING_FROM:
        return Decimal("0.00")
    return SHIPPING[region]


def quote(cart, prices, region, coupon=None, today=None):
    """Price a basket: the goods, the coupon discount, shipping, and VAT on all of it."""
    today = today or date.today()
    subtotal = goods_subtotal(cart, prices)
    discount = coupon_discount(coupon, subtotal, today)
    shipping = shipping_cost(subtotal, region)
    taxable = subtotal - discount + shipping
    vat = (taxable * VAT_RATE).quantize(PENNY, rounding=ROUND_HALF_UP)
    return Quote(subtotal, discount, shipping, vat, taxable + vat)


def fetch_rate(currency):
    """How much of a currency one pound buys, from the rates service. A network call."""
    with urlopen(RATES_URL.format(currency=currency), timeout=5) as response:
        return Decimal(str(json.load(response)["rates"][currency]))


def convert_total(total, currency):
    """A total in another currency, rounded half-up to the cent. GBP is returned as it is."""
    if currency == "GBP":
        return total
    return (total * fetch_rate(currency)).quantize(PENNY, rounding=ROUND_HALF_UP)


def print_quote(q):
    """Print a quote the way the order confirmation email shows it."""
    print(f"Goods     {q.subtotal:>9.2f}")
    if q.discount:
        print(f"Discount  {-q.discount:>9.2f}")
    shipping = "FREE" if q.shipping == 0 else f"{q.shipping:.2f}"
    print(f"Shipping  {shipping:>9}")
    print(f"VAT       {q.vat:>9.2f}")
    print(f"Total     {q.total:>9.2f}")
'''


def _unpack(blob: str) -> str:
    return zlib.decompress(base64.b64decode(blob)).decode("utf-8")


# A correctly fixed pricing.py, and our own checks of the business rules. They're kept encoded so
# the answers aren't in plain sight while you're still looking for the bugs.
FIXED = _unpack(
    "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"
)
RULES = _unpack(
    "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"
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
