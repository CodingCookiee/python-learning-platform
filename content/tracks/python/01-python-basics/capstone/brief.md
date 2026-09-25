A small café has a till that adds up orders but can't print anything a customer would want to keep.
You're going to write the part that turns an order into a receipt: a command-line program that reads
line items as they're typed and prints a neat, aligned, totalled receipt with tax.

It's a small program, but it uses every lesson in this module: numbers that must be exact to the
cent, strings that need cutting up and cleaning, conditions that decide what's valid, and output that
has to line up. Build it in your own editor rather than on this site. Setting up a real file and
running it from a terminal is part of the exercise.

## A sample run

What the user types is shown after each `>` prompt. The fourth line is a mistake, and the program
explains it and carries on:

```text
$ python receipt.py
Enter items as "name, quantity, unit price". Leave a line blank to finish.
> Coffee beans, 2, 8.50
> Oat milk, 3, 1.95
> Croissant, one, 2.40
Skipped "Croissant, one, 2.40": quantity must be a whole number
> Croissant, 1, 2.40
>

Item                 Qty     Total
----------------------------------
Coffee beans           2     17.00
Oat milk               3      5.85
Croissant              1      2.40
----------------------------------
Subtotal                     25.25
Tax (8%)                      2.02
Total                        27.27
```

## Requirements

### Reading the items

- Read one item per line with `input()`, in the form `name, quantity, unit price`.
- Spaces around each part are allowed: `Oat milk,3,1.95` and `  Oat milk ,  3 , 1.95` are the same item.
- Stop reading when the user enters a blank line (a line of only spaces counts as blank).

### Checking each line

A bad line must never crash the program. Skip it, print one line explaining why, and keep reading:

| Problem | Message |
|---------|---------|
| The line doesn't have exactly two commas | `Skipped "<line>": expected name, quantity, unit price` |
| The quantity isn't a whole number of 1 or more | `Skipped "<line>": quantity must be a whole number` |
| The unit price isn't a number | `Skipped "<line>": unit price must be a number like 2.40` |

`<line>` is the line exactly as the user typed it.

### Printing the receipt

When the user finishes, print a blank line and then the receipt, 34 characters wide:

- A header row, `Item`, `Qty` and `Total`, aligned with the columns below it.
- A rule of 34 dashes above and below the items.
- One row per valid item, in the order they were entered: the name left-aligned in 20 characters,
  the quantity right-aligned in 4, and the line total (quantity × unit price) right-aligned in 10
  with exactly two decimal places. Cut names longer than 20 characters down to 20.
- `Subtotal`, `Tax (8%)` and `Total` rows, with their amounts right-aligned under the line totals.
- Tax is 8% of the subtotal, rounded to the cent with halves rounding up. The total is the subtotal
  plus the rounded tax.

If no valid items were entered, print `No items entered.` instead of the receipt.

### Money

Every amount is a `Decimal` built from the text the user typed. Don't let a float anywhere near the
money, not even on the way in: `Decimal(float("1.10"))` already carries the float's error.

## Getting started

1. Make a folder for the project and copy the starter code into `receipt.py`. Run it with
   `python receipt.py` (or `uv run receipt.py`) to check your setup: it asks for items and prints
   nothing yet.
2. Fill in `format_row` and `format_total` first, and try them from the REPL or with a couple of
   `print()` calls. When three hand-written rows line up, the hardest formatting is done.
3. Parse a valid line and add it to the receipt. This is the `parse-line-item` drill from lesson 6,
   plus a running `subtotal`.
4. Add the checks, one problem at a time, and try each bad input from the table above.
5. Print the totals, then run the sample above and compare your output line by line.

### Two things the lessons didn't cover

- **Collecting the rows.** Lists are the next module's subject, and you don't need one here. Keep the
  rows in a string and add each new row with a newline: `rows += format_row(...) + "\n"`. At the end,
  `print(rows, end="")` prints them all.
- **Checking a price.** `Decimal("2.4O")` doesn't raise `ValueError` like `float()` does: it raises
  `InvalidOperation`, which the starter already imports. Catch it the same way lesson 6 showed:

  ```python norun
  try:
      price = Decimal(unit_price)
  except InvalidOperation:
      price = None
  ```

## Try these inputs

Before you submit, run your program with each of these and check the output makes sense:

- The sample run above, exactly.
- A blank line straight away (it should print `No items entered.`).
- `Espresso, 0, 1.20`, `Espresso, -1, 1.20`, `Espresso, 1.5, 1.20` and `Espresso, , 1.20`.
- `Espresso, 1, free` and `Espresso, 1, 1,20` (a comma instead of a decimal point).
- `Single-origin Ethiopian espresso, 12, 14.95`, a long name and a larger total.
- `Mug, 3, 4.99`, then check the tax by hand: 14.97 × 8% is 1.1976, which rounds to 1.20, so the
  total should be 16.17.

## Stretch goals

Pick any you like once the requirements work:

- **Show the unit price.** Add a `Price` column between `Qty` and `Total`, and widen the receipt to
  match (only the width constants should need to change).
- **Thousands separators.** Show `2,500.00` rather than `2500.00`, without breaking the alignment.
- **Better truncation.** Cut long names to 17 characters plus `...`, so it's clear something was cut.
- **Item count.** Print `4 items` under the total, counting quantities (`Coffee beans, 2, …` counts
  as 2), and get the singular right for `1 item`.
- **Coupon codes.** After the blank line, ask for a coupon code and apply the rules from lesson 5's
  coupon drill before tax.
- **Refuse negative prices.** `Refund, 1, -5.00` parses as a valid `Decimal`. Decide whether it
  should, and handle it.

## How to submit

Push `receipt.py` to a GitHub repository (a new public repository is fine) and submit its link on this
capstone's page. The review checks the requirements above by running your program on the sample run
and on bad input, then reads your code against the criteria: exact money, aligned columns, no
crashes, named constants and a clear layout. Include a short `README.md` with the command to run it.
