import pytest

from sales_cli import main


@pytest.fixture
def monday(tmp_path):
    path = tmp_path / "monday.csv"
    path.write_text("item,quantity,unit_price\nMug,2,8.00\nTea,3,3.50\nBeans,2,8.00\n")
    return path


def test_summarises_a_sales_file(monday, capsys):
    assert main([str(monday)]) == 0
    captured = capsys.readouterr()
    assert captured.out == "3 sales, 7 items, total 42.50\n"
    assert captured.err == ""


def test_missing_file_is_reported_on_stderr(tmp_path, capsys):
    assert main([str(tmp_path / "tuesday.csv")]) == 1
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err == "error: no such file: tuesday.csv\n"


def test_no_arguments_prints_usage(capsys):
    assert main([]) == 2
    assert capsys.readouterr().err.startswith("usage:")
