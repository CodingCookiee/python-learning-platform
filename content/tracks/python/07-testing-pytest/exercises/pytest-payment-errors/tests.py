import ast
import re
from functools import cache

from plp import defined_names, hidden, pytest_run, solution_source, source_avoids, source_uses, test

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

MODULE, TEST_FILE = "gateway.py", "test_gateway.py"

CORRECT = '''
from dataclasses import dataclass


class PaymentError(Exception):
    """Base class for every payment failure."""


class CardExpired(PaymentError):
    pass


class CardDeclined(PaymentError):
    def __init__(self, code):
        super().__init__(f"card declined: {code}")
        self.code = code


@dataclass
class Card:
    number: str
    expiry_year: int
    expiry_month: int
    limit_pence: int


def authorize(card, amount_pence, today):
    """Authorize a payment and return a code like "AUTH-4242-1999".

    A card is valid until the end of its expiry month. Raises CardExpired for an
    expired card, and CardDeclined with code "invalid_amount" for an amount that
    isn't positive, or "limit_exceeded" for one above the card's limit.
    """
    if (today.year, today.month) > (card.expiry_year, card.expiry_month):
        raise CardExpired(f"card ending {card.number[-4:]} expired {card.expiry_month:02}/{card.expiry_year}")
    if amount_pence <= 0:
        raise CardDeclined("invalid_amount")
    if amount_pence > card.limit_pence:
        raise CardDeclined("limit_exceeded")
    return f"AUTH-{card.number[-4:]}-{amount_pence}"
'''

EXPIRES_A_MONTH_EARLY = planted(
    "(today.year, today.month) > (card.expiry_year", "(today.year, today.month) >= (card.expiry_year"
)
EXPIRED_AS_GENERIC_ERROR = planted("raise CardExpired(", "raise PaymentError(")
WRONG_DECLINE_CODE = planted('raise CardDeclined("limit_exceeded")', 'raise CardDeclined("invalid_amount")')
LIMIT_IS_EXCLUSIVE = planted("if amount_pence > card.limit_pence:", "if amount_pence >= card.limit_pence:")


@test("Your tests pass on the correct gateway.py")
def _():
    passes_on_correct()


@test("Uses pytest.raises")
def _():
    assert source_uses(name="raises"), "Check each failure with pytest.raises"


@test("Catches a card rejected during its expiry month")
def _():
    assert catches(EXPIRES_A_MONTH_EARLY), (
        "A bug slipped through: a card expiring 09/2026 was refused on 30 September 2026, and all "
        "your tests still passed. Test a payment in the card's expiry month."
    )


@hidden("Catches an expired card raising a plain PaymentError")
def _():
    assert catches(EXPIRED_AS_GENERIC_ERROR), (
        "A bug slipped through: an expired card raised PaymentError instead of CardExpired, and "
        "all your tests still passed. pytest.raises(PaymentError) accepts any subclass, so name "
        "the specific class."
    )


@hidden("Catches the wrong decline code")
def _():
    assert catches(WRONG_DECLINE_CODE), (
        "A bug slipped through: a charge over the limit was declined with code \"invalid_amount\", "
        "and all your tests still passed. Check excinfo.value.code."
    )


@hidden("Catches a charge of exactly the limit being declined")
def _():
    assert catches(LIMIT_IS_EXCLUSIVE), (
        "A bug slipped through: a charge of exactly the card's limit was declined, and all your "
        "tests still passed."
    )
