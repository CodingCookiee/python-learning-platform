from decimal import Decimal

from receipt import print_receipt

LINES = [("Mug", 2, Decimal("8.00")), ("Tea", 1, Decimal("3.50"))]


def test_each_line_shows_its_total(capsys):
    print_receipt(LINES)
    lines = capsys.readouterr().out.splitlines()
    assert lines[0] == "2 x Mug                16.00"
    assert lines[1] == "1 x Tea                 3.50"


def test_last_line_is_the_total(capsys):
    print_receipt(LINES)
    assert capsys.readouterr().out.splitlines()[-1] == "Total: 19.50"


def test_empty_receipt_says_so(capsys):
    print_receipt([])
    assert capsys.readouterr().out == "No items\n"
