import os
import tempfile

import pytest

TESTS = '''
import pytest

def loyalty_discount(years):
    """Percent off: 10 from 3 years of membership, 15 from 6 years."""
    if years > 6:
        return 15
    if years >= 3:
        return 10
    return 0

@pytest.mark.parametrize(
    "years, percent",
    [(2, 0), (3, 10), (6, 15), (7, 15)],
    ids=["two-years", "three-years", "six-years", "seven-years"],
)
def test_loyalty_discount(years, percent):
    assert loyalty_discount(years) == percent

@pytest.mark.parametrize("years", [0, 40])
def test_never_more_than_15(years):
    assert loyalty_discount(years) <= 15

@pytest.mark.parametrize("plan", ["basic", "pro"])
@pytest.mark.parametrize("years", [1, 8])
def test_discount_ignores_plan(years, plan):
    assert loyalty_discount(years) in (0, 15)
'''

os.chdir(tempfile.mkdtemp())
with open("test_loyalty.py", "w") as file:
    file.write(TESTS)


class PrintResults:
    def pytest_runtest_logreport(self, report):
        if report.when == "call":
            print(report.nodeid.split("::")[-1], report.outcome)


pytest.main(
    ["--capture=sys", "-p", "no:terminal", "-p", "no:cacheprovider", "-p", "no:faulthandler"],
    plugins=[PrintResults()],
)
