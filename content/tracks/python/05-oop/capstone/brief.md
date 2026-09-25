Millstone Coffee roasts beans, sells them in its shop and wholesale to cafés, and keeps its stock in
a spreadsheet. Every Friday someone counts the shelves, the numbers never match the spreadsheet,
and nobody can say why. They've asked you for a small stock system that can answer three
questions at any moment: how much of each product is there, how did it get to that number, and
what needs reordering?

You'll build it as one module, `inventory.py`, using the whole of this module: frozen dataclasses
for the records, `__post_init__` for validation, an enum for movement kinds, one class that
enforces the rules, and a plain function for the report. Build it in your own editor. The starter
contains the sample data and a `main()` that prints everything shown below once your classes work.

## A sample run

```text
$ python inventory.py
Low stock report, 25 Sep 2026

SKU       Product                      Stock  Reorder  Order
------------------------------------------------------------
V60-100   V60 paper filters, pack...       0       20     80  OUT
ETH-1KG   Ethiopia Yirgacheffe, 1 kg       6       10     34
MUG-STN   Stoneware mug                    5        6     19
DEC-250   Swiss Water decaf, 250 g        12       12     24
------------------------------------------------------------
4 products to reorder
Stock value: 435.20

22 Sep 09:05  receive     +12  PO-1182
22 Sep 17:30  sale         -3  Shop, Monday
23 Sep 08:15  adjustment   -2  Two broken in the stockroom
24 Sep 17:30  sale         -2  Shop, Wednesday

Refused: GRD-HND: only 4 in stock, can't remove 10
Refused: CUP-PAPER: unknown SKU
Refused: ETH-1KG: an adjustment needs a note
```

The first block is the low-stock report, the second is the movement history of the stoneware mugs,
and the third shows three operations your inventory must refuse.

## The design

The key decision is already made for you: **stock is never stored as a number**. Every delivery,
sale and correction is recorded as a `Movement`, and the stock of a product is the sum of its
movements. That's why the spreadsheet drifted and your system won't: a number can be overwritten,
but a log explains itself. `history()` is how Millstone will answer "why is it 5?".

| Piece | Kind | Job |
|-------|------|-----|
| `Product` | frozen dataclass | What the shop stocks, and when to reorder it |
| `MovementKind` | enum (in the starter) | `RECEIVE`, `SALE` or `ADJUSTMENT` |
| `Movement` | frozen dataclass | One change to one product's stock |
| `LowStockLine` | dataclass | One row of the low-stock report |
| `Inventory` | class | Holds the products and the movement log, and enforces every rule |
| `format_low_stock_report` | function | Turns an inventory into the report text |

`Inventory` is built by composition: it holds a dict of products and a list of movements. It
doesn't inherit from `dict` or `list`, and nothing outside it touches those directly.

## Requirements

### Products

`Product(sku, name, unit_cost, reorder_level, target_level)` is a frozen dataclass.

- `sku` is uppercase letters and digits in groups joined by single hyphens: `ETH-1KG` and `MUG`
  are valid; `eth-1kg`, `ETH--1KG` and `-ETH` are not.
- `name` isn't empty or only spaces. `unit_cost` is a `Decimal` of zero or more.
- `reorder_level` is zero or more, and `target_level` is above `reorder_level`. A product is **low**
  when its stock is at or below its reorder level, and a reorder brings it back up to its target.

Validate all of that in `__post_init__`, raising `ValueError`. Because it's frozen, a product can be
a dict key or a set member, and nobody can change its cost behind the inventory's back.

### Movements

`Movement(sku, change, kind, at, note="")` is a frozen dataclass. `change` is positive for stock
in and negative for stock out; `at` is a `datetime`.

- `change` is never zero.
- A `RECEIVE` movement must add stock, and a `SALE` must remove it. An `ADJUSTMENT` can go either
  way, but must have a note (a stock-count correction nobody can explain is exactly the problem
  Millstone has now).

### The inventory

| Method | Does |
|--------|------|
| `add_product(product)` | Registers a product |
| `product(sku)` | Returns the `Product` for a SKU |
| `products()` | Every product, sorted by SKU |
| `receive(sku, quantity, at, note="")` | Records a delivery of `quantity` and returns the `Movement` |
| `sell(sku, quantity, at, note="")` | Records a sale of `quantity` (stored as a negative change) and returns the `Movement` |
| `adjust(sku, change, at, note)` | Records a correction, positive or negative, and returns the `Movement` |
| `stock(sku)` | The current stock: the sum of that product's movements |
| `history(sku)` | That product's movements, oldest first |
| `valuation()` | The value of all stock at unit cost, as a `Decimal` |
| `low_stock()` | A list of `LowStockLine`, most urgent first (see below) |

### Refusing bad operations

Each of these raises `ValueError` and leaves the inventory exactly as it was: no product added, no
movement recorded. Start every message with the SKU, as in the sample run.

| Problem | Example message |
|---------|-----------------|
| A second product with a SKU that's already registered | `ETH-1KG: already registered` |
| Any operation on a SKU that isn't registered | `CUP-PAPER: unknown SKU` |
| `receive` or `sell` with a quantity of zero or less | `ETH-1KG: quantity must be more than zero` |
| An adjustment with an empty note | `ETH-1KG: an adjustment needs a note` |
| A sale or adjustment that would take stock below zero | `GRD-HND: only 4 in stock, can't remove 10` |

### The low-stock report

`low_stock()` returns a `LowStockLine(sku, name, stock, reorder_level, suggested_order)` for every
product at or below its reorder level, where `suggested_order` is `target_level - stock`. The order
is the order someone should phone suppliers in:

1. products that are out of stock,
2. then the rest by how far below their reorder level they are, furthest first (`ETH-1KG` is 4
   below; `MUG-STN` is 1 below; `DEC-250` is exactly at its level),
3. then by SKU, to break ties.

`format_low_stock_report(inventory, today)` returns the report as one string, lines joined with
`\n`:

- `Low stock report, 25 Sep 2026` (the date as day, short month name, year), then a blank line.
- A header and a rule of 60 dashes, then one row per `LowStockLine`, then another rule. The columns:
  SKU left-aligned in 10, the product name left-aligned in 28, then stock, reorder level and
  suggested order right-aligned in 6, 9 and 7.
- A name longer than 27 characters is cut to its first 24, with any trailing spaces removed, and
  followed by `...`.
- An out-of-stock row ends with two spaces and `OUT`.
- `4 products to reorder`, or `1 product to reorder` for one.
- Finally `Stock value: 435.20`, with a thousands separator and two decimals.

When nothing is low, the blank line is followed by `Every product is above its reorder level.` and
then the stock value line, with no table.

## Getting started

1. Copy the starter into `inventory.py`. Until the methods are written, running it fails partway
   through `main()`; that's expected.
2. Write `Product.__post_init__` and `Movement.__post_init__` first, and try them in the REPL:
   `Product("eth-1kg", ...)` should raise, `Product("ETH-1KG", ...)` shouldn't.
3. Write `Inventory.__init__`, `add_product`, `product`, `receive` and `stock`. At that point you
   can load the products and receipts and check the stock of each one.
4. Add `sell` and `adjust`, with the refusals. The two share almost everything with `receive`, so a
   private `_record(movement)` method that checks and appends is worth having.
5. Add `history`, `valuation` and `products`, then `LowStockLine`, `low_stock` and the report. Run
   `python inventory.py` and compare the output with the sample line by line.

### Things the lessons didn't cover

- **Summing Decimals.** `sum()` starts from the integer `0`, which works, but
  `sum(values, Decimal("0"))` makes it obvious the result is money. `f"{amount:,.2f}"` formats a
  `Decimal` just like a float.
- **Sorting the report.** Either sort with a key function,
  `sorted(lines, key=lambda line: (line.stock > 0, line.stock - line.reorder_level, line.sku))`,
  or give `LowStockLine` `order=True` with that tuple as its first field (declared with
  `field(init=False, repr=False)` and set in `__post_init__`). `False` sorts before `True`, which
  puts out-of-stock products first.
- **Catching a refusal.** `main()` uses `except ValueError as error:` to print the message a
  `ValueError` was raised with. Module 6 covers exceptions properly.

## Try these

Before you submit, check each of these in the REPL, starting from `load_sample()`:

- `inventory.sell("ETH-1KG", 6, friday)` works and leaves 0; a further `sell("ETH-1KG", 1, friday)`
  is refused, and `len(inventory.history("ETH-1KG"))` is the same before and after the refusal.
- `inventory.adjust("MUG-STN", 3, friday, "Found a box behind the till")` brings the mugs up to 8,
  above their reorder level, so they leave the report.
- `inventory.add_product(Product("ETH-1KG", "Duplicate", Decimal("1"), 1, 2))` is refused.
- `Product("GRD-HND", "Grinder", Decimal("21.00"), 5, 5)` is refused: the target must be above the
  reorder level.
- A fresh `Inventory()` with one product and no movements: its stock is 0, so it's out of stock
  and appears in the report with `OUT`, and the stock value is `0.00`.
- Receive 20 of everything in the sample, then print the report: only the filters remain, at
  exactly their reorder level of 20, with a suggested order of 60. Receive 10 more of everything and
  it says `Every product is above its reorder level.`, with a stock value of `2,206.70`.

## Stretch goals

Pick any you like once the requirements work:

- **Stock on a date.** `stock(sku, as_of=None)` sums only the movements up to `as_of`, so Millstone
  can see what the shelves held last Friday.
- **Sales this week.** `sold_between(start, end)` returns a `Counter` of units sold per SKU in that
  window, built from the log.
- **Suppliers.** Add a frozen `Supplier(name, lead_time_days)` dataclass and give each product one,
  by composition. Group the low-stock report by supplier, so each supplier gets one order.
- **Slots.** Add `slots=True` to the dataclasses and check that assigning a misspelled attribute to
  a `LowStockLine` now fails.
- **Undo.** `undo_last(sku)` removes the most recent movement for a SKU, but only if that doesn't
  take any stock below zero. Decide whether "remove" or "record a reversing adjustment" is the
  better design, and say why in your README.
- **Tests.** Write `test_inventory.py` with plain `assert` statements covering each refusal.
  Module 7 shows how to run them with pytest.

## How to submit

Push `inventory.py` and a short `README.md` (what it does and the command to run it) to a GitHub
repository, and submit its link on this capstone's page. The review runs hidden tests against
`Product`, `Movement` and `Inventory`, runs `python inventory.py` and compares it with the sample,
then reads your code against the criteria: dataclasses doing the boilerplate, stock derived from
the log, refusals that change nothing, composition over inheritance, exact money and a report
function kept separate from the class.
