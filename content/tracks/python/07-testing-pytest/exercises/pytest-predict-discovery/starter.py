import os
import tempfile

import pytest

TEST_CHECKOUT = '''
def test_empty_cart_costs_nothing():
    assert True

def check_discount_applies():
    assert True

def test_vat_is_twenty_percent():
    assert True

class TestRefunds:
    def test_full_refund(self):
        assert True

    def refund_for(self, amount):
        return amount

class TestInvoiceNumbers:
    def __init__(self):
        self.next_number = 1

    def test_numbers_increase(self):
        assert True

class RefundRules:
    def test_partial_refund(self):
        assert True

def test_vat_is_twenty_percent():
    assert False
'''

CHECKOUT_HELPERS = '''
def test_helper_builds_a_cart():
    assert True
'''

os.chdir(tempfile.mkdtemp())
with open("test_checkout.py", "w") as file:
    file.write(TEST_CHECKOUT)
with open("checkout_helpers.py", "w") as file:
    file.write(CHECKOUT_HELPERS)


class PrintCollected:
    def pytest_collection_finish(self, session):
        for item in session.items:
            print(item.nodeid)


# --collect-only finds the tests without running them, and no:terminal hides pytest's own report
# (--capture=sys and the last two -p flags are only needed in the browser)
pytest.main(
    ["--collect-only", "--capture=sys", "-p", "no:terminal", "-p", "no:cacheprovider", "-p", "no:faulthandler"],
    plugins=[PrintCollected()],
)
