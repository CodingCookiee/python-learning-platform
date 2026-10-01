import pytest

from cli import main


def test_reports_in_gbp(capsys):
    assert main(["report", "invoices.csv", "--currency", "GBP"]) == 0
    assert capsys.readouterr().out == "Reporting on invoices.csv in GBP\n"


def test_missing_subcommand_is_a_usage_error(capsys):
    with pytest.raises(SystemExit) as exit:
        main([])
    assert exit.value.code == 2
    assert "usage:" in capsys.readouterr().err
