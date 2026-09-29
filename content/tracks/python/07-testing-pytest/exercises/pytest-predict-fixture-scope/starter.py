import os
import tempfile

import pytest

TESTS = '''
import pytest

@pytest.fixture(scope="module")
def gateway():
    print("connect to gateway")
    yield "gateway"
    print("disconnect from gateway")

@pytest.fixture
def order():
    print("create order")
    yield {"id": 1042, "paid": False}
    print("delete order")

def test_charge(gateway, order):
    print("charge order")
    order["paid"] = True

def test_order_starts_unpaid(order):
    print("check order, paid =", order["paid"])

def test_receipt(gateway, order):
    print("print receipt")
    assert order["paid"]
'''

os.chdir(tempfile.mkdtemp())
with open("test_payments.py", "w") as file:
    file.write(TESTS)


class PrintResults:
    def pytest_runtest_logreport(self, report):
        if report.when == "call":
            print(report.outcome + ":", report.nodeid.split("::")[-1])


# -s shows the prints; no:terminal hides pytest's own report
pytest.main(
    ["-s", "-p", "no:terminal", "-p", "no:cacheprovider", "-p", "no:faulthandler"],
    plugins=[PrintResults()],
)
