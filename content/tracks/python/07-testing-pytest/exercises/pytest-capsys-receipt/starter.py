from decimal import Decimal

from receipt import print_receipt


def test_receipt_prints_something(capsys):
    print_receipt([("Mug", 2, Decimal("8.00"))])
    assert capsys.readouterr().out != ""
