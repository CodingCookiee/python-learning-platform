"""Acceptance tests for the receipt printer, run by GitHub Actions in your repository.

They run `python receipt.py` from the top of your repository, type the input for you, and
check what it prints against the brief.
"""

import subprocess
import sys
from pathlib import Path

PROGRAM = Path("receipt.py")

SAMPLE = [
    "Coffee beans, 2, 8.50",
    "Oat milk, 3, 1.95",
    "Croissant, one, 2.40",
    "Croissant, 1, 2.40",
]

SAMPLE_RECEIPT = """\
Item                 Qty     Total
----------------------------------
Coffee beans           2     17.00
Oat milk               3      5.85
Croissant              1      2.40
----------------------------------
Subtotal                     25.25
Tax (8%)                      2.02
Total                        27.27"""


def run(*lines: str) -> subprocess.CompletedProcess[str]:
    """Run the program, typing each line, then a blank line to finish."""
    assert PROGRAM.exists(), "receipt.py should be at the top of your repository"
    return subprocess.run(
        [sys.executable, str(PROGRAM)],
        input="\n".join([*lines, ""]) + "\n",
        capture_output=True,
        text=True,
        timeout=20,
    )


def output(*lines: str) -> str:
    """What the program printed, without the "> " input prompts."""
    result = run(*lines)
    assert result.returncode == 0, f"The program crashed:\n{result.stderr[-1500:]}"
    return result.stdout.replace("> ", "")


def receipt(text: str) -> list[str]:
    """The receipt's lines, from the header row to the total, trailing spaces removed."""
    lines = [line.rstrip() for line in text.splitlines()]
    start = next((i for i, line in enumerate(lines) if line.startswith("Item")), None)
    assert start is not None, f"No receipt header (a row starting with Item) in:\n{text}"
    end = next((i for i, line in enumerate(lines) if line.startswith("Total") and i > start), None)
    assert end is not None, f"No Total row in:\n{text}"
    return lines[start : end + 1]


def test_sample_run_prints_the_receipt_from_the_brief():
    assert receipt(output(*SAMPLE)) == SAMPLE_RECEIPT.splitlines()


def test_explains_and_skips_a_bad_quantity():
    assert 'Skipped "Croissant, one, 2.40": quantity must be a whole number' in output(*SAMPLE)


def test_no_valid_items_prints_no_items_entered():
    text = output()
    assert "No items entered." in text
    assert "Total" not in text


def test_wrong_number_of_commas_is_skipped():
    text = output("Espresso 1 1.20", "Espresso, 1, 1,20")
    assert 'Skipped "Espresso 1 1.20": expected name, quantity, unit price' in text
    assert 'Skipped "Espresso, 1, 1,20": expected name, quantity, unit price' in text


def test_quantities_must_be_whole_numbers_of_one_or_more():
    bad = ["Espresso, 0, 1.20", "Espresso, -1, 1.20", "Espresso, 1.5, 1.20", "Espresso, , 1.20"]
    text = output(*bad)
    for line in bad:
        assert f'Skipped "{line}": quantity must be a whole number' in text


def test_prices_must_be_numbers():
    assert 'Skipped "Espresso, 1, free": unit price must be a number like 2.40' in output("Espresso, 1, free")


def test_spaces_around_each_part_are_allowed():
    rows = receipt(output("  Oat milk ,  3 , 1.95"))
    assert rows[2] == "Oat milk               3      5.85"


def test_tax_rounds_half_up_to_the_cent():
    rows = receipt(output("Mug, 3, 4.99"))
    assert rows[-2:] == ["Tax (8%)                      1.20", "Total                        16.17"]


def test_long_names_are_cut_to_20_characters_and_columns_line_up():
    rows = receipt(output("Single-origin Ethiopian espresso, 12, 14.95", "Mug, 1, 4.99"))
    assert rows[2] == "Single-origin Ethiop  12    179.40"
    for row in rows:
        assert len(row) == 34, f"Every receipt row should be 34 characters wide, got {len(row)}: {row!r}"


def test_no_input_crashes_it():
    garbage = ["", "  ,  ,  ", "x, 1e3, 2", "x, 2, NaN?", "x, 99999999999999999999, 1.00", "x, 1, Infinityy", ",,"]
    result = run(*garbage[1:])
    assert result.returncode == 0, f"The program crashed:\n{result.stderr[-1500:]}"
    assert "Traceback" not in result.stderr


def test_importing_it_doesnt_start_the_program():
    result = subprocess.run(
        [sys.executable, "-c", "import receipt"], input="", capture_output=True, text=True, timeout=20
    )
    assert result.returncode == 0, 'Importing receipt.py ran the program: keep it under if __name__ == "__main__":'
    assert "Enter items" not in result.stdout
