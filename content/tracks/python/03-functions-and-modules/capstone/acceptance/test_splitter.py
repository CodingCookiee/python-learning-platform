"""Acceptance tests for the expense splitter, run by GitHub Actions in your repository.

They import the functions in splitter.py, then run `python cli.py` from the top of your
repository, type the group and the expenses for you, and check the report it prints.
"""

import importlib
import os
import subprocess
import sys
from pathlib import Path

import pytest

GROUP = ["ada", "grace", "linus"]

SAMPLE = [
    "ada grace linus",
    "ada paid 60 for dinner",
    "grace paid 18.50 for taxi split grace linus",
    "linus paid £12 for coffee and cake split ada linus",
    "bob paid 5 for crisps",
    "ada paid ten for snacks",
]

SAMPLE_REPORT = [
    "Balances",
    "ada +£34.00",
    "grace -£10.75",
    "linus -£23.25",
    "To settle up",
    "linus pays ada £23.25",
    "grace pays ada £10.75",
]


def splitter():
    """The learner's splitter module."""
    assert Path("splitter.py").exists(), "splitter.py should be at the top of your repository"
    return importlib.import_module("splitter")


def run(*lines: str) -> subprocess.CompletedProcess[str]:
    """Run cli.py, typing each line, then a blank line to finish."""
    assert Path("cli.py").exists(), "cli.py should be at the top of your repository"
    return subprocess.run(
        [sys.executable, "cli.py"],
        input="\n".join([*lines, ""]) + "\n",
        capture_output=True,
        text=True,
        encoding="utf-8",
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        timeout=20,
    )


def output(*lines: str) -> str:
    result = run(*lines)
    assert result.returncode == 0, f"cli.py crashed:\n{result.stderr[-1500:]}"
    return result.stdout


def report(text: str) -> list[str]:
    """The report from "Balances" on: blank lines dropped, runs of spaces collapsed to one."""
    start = text.find("Balances")
    assert start != -1, f"No Balances section in the output:\n{text}"
    return [" ".join(line.split()) for line in text[start:].splitlines() if line.strip()]


def test_to_pence_reads_pounds_with_or_without_a_pound_sign():
    to_pence = splitter().to_pence
    assert to_pence("18.50") == 1850
    assert to_pence("£18.50") == 1850
    assert to_pence("60") == 6000
    assert to_pence("£12") == 1200
    assert to_pence("0.05") == 5
    assert isinstance(to_pence("18.50"), int), "to_pence should return an int number of pence"


def test_to_pence_refuses_anything_that_isnt_a_positive_amount():
    to_pence = splitter().to_pence
    for text in ["ten", "", "£", "0", "-5", "£-1.00", "12.5.0"]:
        with pytest.raises(ValueError):
            to_pence(text)
            pytest.fail(f"to_pence({text!r}) should raise ValueError")


def test_format_pence():
    format_pence = splitter().format_pence
    assert format_pence(1250) == "£12.50"
    assert format_pence(-305) == "-£3.05"
    assert format_pence(5) == "£0.05"
    assert format_pence(123456) == "£1234.56"
    assert format_pence(1250, sign=True) == "+£12.50"
    assert format_pence(-305, sign=True) == "-£3.05"
    assert format_pence(0) == "£0.00"
    assert format_pence(0, sign=True) == "£0.00", "Zero is always £0.00, even with sign=True"


def test_format_pence_sign_is_keyword_only():
    with pytest.raises(TypeError):
        splitter().format_pence(1250, True)


def test_split_evenly_gives_leftover_pence_to_the_first_people_listed():
    split_evenly = splitter().split_evenly
    assert split_evenly(1000, ["ada", "grace", "linus"]) == {"ada": 334, "grace": 333, "linus": 333}
    assert split_evenly(1001, ["linus", "ada", "grace"]) == {"linus": 334, "ada": 334, "grace": 333}, (
        "Leftover pence go to the first people in the order given, not in alphabetical order"
    )
    assert split_evenly(900, ["ada", "grace", "linus"]) == {"ada": 300, "grace": 300, "linus": 300}
    assert split_evenly(1, ["ada", "grace"]) == {"ada": 1, "grace": 0}
    shares = split_evenly(1849, ["a", "b", "c", "d", "e", "f", "g"])
    assert sum(shares.values()) == 1849, "The shares must add up to the full amount"


def test_parse_expense_reads_each_shape_of_line():
    parse_expense = splitter().parse_expense
    assert parse_expense("ada paid 60 for dinner", GROUP) == {
        "payer": "ada", "amount": 6000, "description": "dinner", "shared_by": ["ada", "grace", "linus"],
    }, "Without split, the whole group shares the expense"
    assert parse_expense("grace paid 18.50 for taxi split grace linus", GROUP) == {
        "payer": "grace", "amount": 1850, "description": "taxi", "shared_by": ["grace", "linus"],
    }
    assert parse_expense("linus paid £12 for coffee and cake split ada linus", GROUP) == {
        "payer": "linus", "amount": 1200, "description": "coffee and cake", "shared_by": ["ada", "linus"],
    }
    assert parse_expense("ada paid 9 for flowers split linus", GROUP)["shared_by"] == ["linus"], (
        "The payer doesn't have to be one of the people sharing the expense"
    )


def test_parse_expense_refuses_a_line_it_cant_accept():
    parse_expense = splitter().parse_expense
    bad = [
        "bob paid 5 for crisps",
        "ada paid 5 for crisps split grace bob",
        "ada paid ten for snacks",
        "ada paid 0 for nothing",
        "ada paid -5 for a refund",
        "ada bought 5 for crisps",
        "ada paid 5",
        "ada",
    ]
    for line in bad:
        with pytest.raises(ValueError):
            parse_expense(line, GROUP)
            pytest.fail(f"parse_expense({line!r}, ...) should raise ValueError")


def test_balances_cover_everyone_and_add_up_to_zero():
    lib = splitter()
    expenses = [lib.parse_expense("ada paid 10 for pizza", GROUP)]
    assert lib.balances(expenses, GROUP) == {"ada": 666, "grace": -333, "linus": -333}

    group = ["ada", "grace", "linus", "ken"]
    expenses = [
        lib.parse_expense(line, group)
        for line in [
            "ada paid 60 for dinner split ada grace linus",
            "grace paid 18.50 for taxi split grace linus",
            "linus paid £12 for coffee and cake split ada linus",
        ]
    ]
    totals = lib.balances(expenses, group)
    assert totals == {"ada": 3400, "grace": -1075, "linus": -2325, "ken": 0}, (
        "Everyone in the group gets a balance, including people with no expenses"
    )
    assert sum(totals.values()) == 0


def test_settle_follows_the_brief():
    settle = splitter().settle
    as_tuples = lambda payments: [tuple(p) for p in payments]  # noqa: E731
    assert as_tuples(settle({"ada": 666, "grace": -333, "linus": -333})) == [("grace", "ada", 333), ("linus", "ada", 333)]
    assert as_tuples(settle({"ada": 3400, "grace": -1075, "linus": -2325})) == [
        ("linus", "ada", 2325), ("grace", "ada", 1075),
    ], "The person who owes most pays the person who is owed most first"
    assert as_tuples(settle({"zed": 300, "abe": 300, "kim": -600})) == [("kim", "abe", 300), ("kim", "zed", 300)], (
        "When two people are owed the same, the alphabetically first is paid first"
    )
    assert as_tuples(settle({"ada": 0, "grace": 0})) == [], "Nobody owes anything, so there are no payments"


def test_settle_brings_everyone_to_zero_in_at_most_n_minus_1_payments():
    settle = splitter().settle
    totals = {"ada": 400, "bob": 300, "cat": 300, "dan": -600, "eve": -400, "fay": 0}
    payments = settle(dict(totals))
    remaining = dict(totals)
    for debtor, creditor, pence in payments:
        assert pence > 0, f"Every payment should be a positive amount, got {pence}"
        remaining[debtor] += pence
        remaining[creditor] -= pence
    assert all(pence == 0 for pence in remaining.values()), f"After the payments, someone isn't square: {remaining}"
    assert len(payments) <= len(totals) - 1


def test_sample_run_prints_the_report_from_the_brief():
    assert report(output(*SAMPLE)) == SAMPLE_REPORT


def test_bad_lines_are_skipped_with_a_reason_and_the_program_carries_on():
    text = output(*SAMPLE)
    skipped = [line for line in text.splitlines() if "Skipped: " in line]
    assert len(skipped) == 2, f"The two bad lines in the sample should each print 'Skipped: <reason>':\n{text}"
    assert all(line.split("Skipped: ", 1)[1].strip() for line in skipped), "Each Skipped: line should give a reason"


def test_balances_are_aligned_in_the_groups_order():
    # £100 shared by linus, ada and margaret: 3334, 3333 and 3333 pence, the extra penny on linus
    text = output("linus ada margaret", "ada paid 100 for a very large cake")
    assert report(text)[1:4] == ["linus -£33.34", "ada +£66.67", "margaret -£33.33"], (
        "Balances should be listed in the group's order, with the leftover penny on the first person listed"
    )
    rows = text[text.find("Balances"):].splitlines()[1:4]
    assert len({len(row.rstrip()) for row in rows}) == 1, (
        "The balance amounts should be right-aligned, so every row ends in the same column:\n" + "\n".join(rows)
    )
    starts = {len(row) - len(row.lstrip()) for row in rows}
    assert len(starts) == 1, "The names should start in the same column:\n" + "\n".join(rows)


def test_everyone_is_square_when_nothing_is_owed():
    text = output("ada grace", "ada paid 10 for lunch split grace", "grace paid 10 for coffee split ada")
    assert "Everyone is square." in text, "With every balance at zero, print 'Everyone is square.'"
    assert " pays " not in text
    assert report(text)[1:3] == ["ada £0.00", "grace £0.00"]


def test_importing_the_files_prints_nothing_and_asks_for_nothing():
    for module in ("splitter", "cli"):
        assert Path(f"{module}.py").exists(), f"{module}.py should be at the top of your repository"
        result = subprocess.run(
            [sys.executable, "-c", f"import {module}"], input="", capture_output=True, text=True, timeout=20
        )
        assert result.returncode == 0, (
            f"Importing {module}.py failed or ran the program: keep the program in main(), called "
            f'only under if __name__ == "__main__":\n{result.stderr[-800:]}'
        )
        assert result.stdout == "", f"Importing {module}.py printed something: {result.stdout!r}"
    result = subprocess.run(
        [sys.executable, "-c", "import cli; assert callable(cli.main)"], input="", capture_output=True, text=True, timeout=20
    )
    assert result.returncode == 0, "cli.py should define a main() function"
