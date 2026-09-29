import pytest

from sales_cli import main


def test_summarises_a_sales_file(tmp_path):
    sales = tmp_path / "monday.csv"
    sales.write_text("item,quantity,unit_price\nMug,2,8.00\n")
    assert main([str(sales)]) == 0


# Check the output with capsys, and the error cases
