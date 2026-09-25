Three friends share a flat, a weekend away, or a team lunch budget. Over a few days, different
people pay for different things, and not everything is shared by everyone. At the end, someone has
to work out who owes whom, and it's always the person who is worst at arithmetic.

You'll build **Expense splitter**, a tool that does it for them. It comes in two parts, the same way
real Python projects do:

- **`splitter.py`**, a library: plain functions that parse expenses, split amounts and settle
  debts. It prints nothing and reads no input, so any other program (or a test suite) can import
  and reuse it.
- **`cli.py`**, the command-line entry point: it reads what people typed, calls the library, and
  prints a report.

This is your first project outside the browser. Create a folder, put both files in it, and run it
from a terminal with `python cli.py` (or `uv run cli.py`).

## A sample run

What you type is shown after the prompts. The last line is blank, which ends the list.

```text
Who's in the group? ada grace linus
> ada paid 60 for dinner
> grace paid 18.50 for taxi split grace linus
> linus paid £12 for coffee and cake split ada linus
> bob paid 5 for crisps
Skipped: Unknown person: bob
> ada paid ten for snacks
Skipped: could not convert string to float: 'ten'
>

Balances
  ada     +£34.00
  grace   -£10.75
  linus   -£23.25

To settle up
  linus pays ada £23.25
  grace pays ada £10.75
```

Check the arithmetic yourself before you start. Dinner (£60) is shared three ways, £20 each. The
taxi (£18.50) is shared by Grace and Linus, £9.25 each. The coffee (£12) is shared by Ada and Linus,
£6 each. Ada paid £60 and her shares cost £26, so she's owed £34. The balances always add up to
zero: every penny someone is owed, someone else owes.

## Requirements

### The input

1. The first line is the group: names separated by spaces, such as `ada grace linus`. Names are
   single words.
2. Each following line is one expense:

   ```text
   <name> paid <amount> for <description> [split <name> <name> ...]
   ```

   - `<amount>` is in pounds, with or without a `£` sign: `60`, `18.50`, `£12`.
   - `<description>` can be several words.
   - Without `split`, the expense is shared by **the whole group**. With `split`, it's shared only
     by the names after it (and the payer doesn't have to be one of them).
3. A blank line ends the input.
4. A line that doesn't fit this shape, uses a name that isn't in the group, or has an amount that
   isn't a positive number, is **skipped**: print `Skipped: ` and the reason, and carry on.

### Money is whole pence

Floats can't represent most amounts of money exactly (`0.1 + 0.2` isn't `0.3`), and errors of a
penny add up. So convert every amount to an `int` number of pence as soon as you read it, do all
the arithmetic in pence, and only turn it back into pounds when you print.

Splitting pence evenly doesn't always work out: £10.00 between three people is 1000 pence, which is
333 each with 1 penny left over. **Leftover pence go one each to the first people listed**, in the
order they appear after `split` (or in the group's order when there's no `split`). So £10.00 split
`ada grace linus` is 334, 333 and 333 pence. That way, the shares always add up to the full amount.

### The library: `splitter.py`

Write these functions. Their names and parameters are part of the brief, because the reviewer's
checks import them.

| Function | Returns |
|----------|---------|
| `to_pence(text)` | `"18.50"` or `"£18.50"` as `1850`. Raises `ValueError` if the text isn't a number, or isn't positive. |
| `format_pence(pence, *, sign=False)` | `1250` as `"£12.50"`, `-305` as `"-£3.05"`. With `sign=True`, positive amounts get a `+`: `"+£12.50"`. Zero is always `"£0.00"`. |
| `split_evenly(amount, people)` | A dict of each person's share in pence, with the leftover rule above: `split_evenly(1000, ["ada", "grace", "linus"])` is `{"ada": 334, "grace": 333, "linus": 333}`. |
| `parse_expense(line, group)` | A dict for one expense line: `{"payer": "grace", "amount": 1850, "description": "taxi", "shared_by": ["grace", "linus"]}`. Raises `ValueError`, with a helpful message, for anything it can't accept. |
| `balances(expenses, group)` | `{person: pence}` for everyone in the group. Positive means the group owes them money; negative means they owe. |
| `settle(totals)` | Given the dict that `balances` returned, a list of payments `(debtor, creditor, pence)` that brings every balance to zero. |

`sign` is **keyword-only**, which lesson 3 explained: `format_pence(1250, True)` should be a
`TypeError`, because nobody reading that call could tell what `True` means.

### Settling up

A group of *n* people never needs more than *n* − 1 payments. This simple method stays within that
limit:

1. Find the person who owes the most, and the person who is owed the most.
2. The first pays the second the smaller of those two amounts. That settles at least one of them
   completely.
3. Repeat until nobody owes anything.

When two people owe (or are owed) the same amount, take them in alphabetical order, so the output is
always the same for the same input. Remember `min()` and `max()` with a `key` that returns a tuple.

### The program: `cli.py`

- `from splitter import ...` whatever it needs.
- All the input and printing lives in a function called `main()`, which is only called under
  `if __name__ == "__main__":`. Importing `cli.py` must not ask for anything.
- Print the report in the format of the sample run. Balances are listed in the group's order, with
  the names padded to the same width and the amounts right-aligned. If there's nothing to settle,
  print `Everyone is square.` instead of the payments.

### Code quality

- Every function has a docstring that says what it returns.
- No function changes a global variable, and no parameter has a mutable default.
- `splitter.py` never calls `print()` or `input()`.

## Checking your work

You'll write proper test suites in module 7. For now, a short script of `assert`s catches most
mistakes. Save it next to your files as `check.py` and run it after every change:

```python norun
from splitter import balances, format_pence, parse_expense, settle, split_evenly, to_pence

assert to_pence("£18.50") == 1850
assert format_pence(-305) == "-£3.05"
assert format_pence(1250, sign=True) == "+£12.50"
assert split_evenly(1000, ["ada", "grace", "linus"]) == {"ada": 334, "grace": 333, "linus": 333}

group = ["ada", "grace", "linus"]
expenses = [parse_expense("ada paid 10 for pizza", group)]
totals = balances(expenses, group)
assert totals == {"ada": 666, "grace": -333, "linus": -333}
assert sum(totals.values()) == 0
assert settle(totals) == [("grace", "ada", 333), ("linus", "ada", 333)]

print("All checks passed")
```

Then run `python cli.py` and type in the sample run. Your output should match it exactly.

## Stretch goals

Pick any that interest you once the core works:

- **Uneven splits.** Accept weights, as in `split ada:2 grace:1`, where Ada's share is twice
  Grace's. Keep the leftover-pence rule, so the shares still add up to the amount.
- **A spending summary.** After the balances, print the total spent and what each person paid.
- **Currency.** Give `format_pence` a keyword-only `symbol="£"` parameter and let the program ask
  for it up front.
- **Fewer payments.** The simple method doesn't always find the fewest payments. With balances of
  ada +£4, bob +£3, cat +£3, dan −£6 and eve −£4, it makes four payments, but three are enough:
  eve's debt matches ada's credit exactly, so eve can pay ada directly. Improve `settle` so that it
  pays off exact matches like that first.

## How to submit

Submit `splitter.py` and `cli.py` (and `check.py` if you wrote it) on this page, either by
uploading the files or by linking a GitHub repository. In the notes, paste the output of one run of
your program. The review checks the requirements and criteria listed on this page.
