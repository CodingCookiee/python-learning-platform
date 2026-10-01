Fernhill Tea sells loose-leaf tea, teapots and mugs online. Every basket on their site is priced
by one module, `pricing.py`, written by a contractor in 2021 and never tested. It mostly works.
But the finance team keeps finding orders whose totals don't match their spreadsheet, and
next month the owner wants to change the shipping rates. Nobody wants to touch the module.

They've asked you to do what should have been done in 2021: write a test suite that pins down
how pricing is supposed to work, use it to find what's wrong, and fix it. There are **three bugs**
in the module. Your tests should find all three.

The starter is `pricing.py` itself, exactly as it runs in production. Work on your own machine,
in a project with pytest installed.

## The business rules

These rules are the specification. Where the code disagrees with them, the code is wrong. Every
price in the price list excludes VAT, and every amount is a `Decimal` in pounds.

### The price list

`load_price_list(path)` reads a CSV file with a header row, `sku,name,price`, and returns
`{sku: (name, price)}`:

```text
sku,name,price
EB-250,"English breakfast, 250 g",6.50
EG-100,"Earl grey, 100 g",4.25
MUG-01,Stoneware mug,12.00
POT-1L,"Glass teapot, 1 l",24.50
```

- Blank lines are skipped. Spaces around the SKU and the name are removed.
- A SKU that appears twice, a price that's missing or isn't a number, and a negative price each
  raise `ValueError` naming the line of the file it's on, like `line 3: EB-250 appears twice`.

### Lines and goods

- `line_total(unit_price, quantity)` is the unit price times the quantity. A quantity below 1
  raises `ValueError`.
- **Bulk discount:** 10 or more of one product take 5% off that line. The discount is rounded
  half-up to the penny before it's taken off.
- `goods_subtotal(cart, prices)` adds up the lines of a cart, a dict of `{sku: quantity}`. A SKU
  that isn't in the price list raises `ValueError`.

### Coupons

`coupon_discount(coupon, subtotal, today)` returns what a `Coupon` takes off the goods subtotal:

- `percent` of the subtotal, rounded **half-up** to the penny: an amount that ends in exactly half a
  penny rounds up.
- A coupon can be used up to and including its `expires` date, and from the day after it takes
  nothing off.
- A coupon with a `minimum` takes nothing off a subtotal below that minimum. The minimum is checked
  against the subtotal before the discount.
- With no coupon (`None`), the discount is 0.

### Shipping

`shipping_cost(goods, region)`:

| Region | Shipping |
|--------|----------|
| `UK` | 3.95 |
| `EU` | 7.50 |
| `WORLD` | 14.00 |

- Shipping is free when the goods come to 50.00 or more **after the coupon discount**: a
  customer can't get free shipping with goods that cost them less than 50.00.
- Any other region raises `ValueError`.

### The quote

`quote(cart, prices, region, coupon=None, today=None)` returns a `Quote` of `subtotal`,
`discount`, `shipping`, `vat` and `total`:

- VAT is 20% of the goods after the discount **plus** shipping, rounded half-up to the penny.
- The total is the goods after the discount, plus shipping, plus VAT.
- `today` is the date the coupon is checked against. It defaults to the real date; your tests must
  always pass it.

### Currencies and output

- `convert_total(total, currency)` returns a total in another currency: GBP unchanged, anything else
  multiplied by the rate from `fetch_rate(currency)` and rounded half-up to the cent. `fetch_rate`
  calls Fernhill's rates service over the network, so **no test may call it**. Replace it.
- `print_quote(q)` prints the quote as it appears in the order confirmation email. A line for the
  discount appears only when there is one, and free shipping is shown as `FREE`.

## A sample

```python
prices = load_price_list("prices.csv")
print_quote(quote({"EB-250": 2, "MUG-01": 1}, prices, "UK", today=date(2026, 9, 29)))
```

```text
Goods         25.00
Shipping       3.95
VAT            5.79
Total         34.74
```

Two teas and a mug come to 25.00, shipping to the UK is 3.95, and VAT is 20% of 28.95.

## What to deliver

1. **`test_pricing.py`**: the suite. Test every rule above, including every boundary and every
   refusal.
2. **`BUGS.md`**: one section per bug, with the rule it breaks, the test that exposes it, the
   expected and actual values, and the fix you made.
3. **`pricing.py`**, fixed. Three small, separate changes, and nothing else.

## Getting started

1. Make a project and install pytest: `uv init fernhill-pricing`, then `uv add --dev pytest`.
   Save the starter as `pricing.py` and create `test_pricing.py` next to it. `uv run pytest -q`
   should say `no tests ran`.
2. Before writing any code, turn the rules into a **test plan**: a list of behaviours, one line
   each, with the boundary values you'll use. "10 of a product get the bulk discount; 9 don't" is one
   line of the plan and a parametrize table in the suite.
3. Write the tests **from the rules, not from the code**. If you read `line_total` and write down
   whatever it returns, you've written a test that agrees with the bug. The rules say what should
   happen; the code is what you're checking.
4. Work bottom up: `load_price_list`, `line_total`, `goods_subtotal`, `coupon_discount`,
   `shipping_cost`, then `quote`, `convert_total` and `print_quote`. Run the suite after every few
   tests.
5. When a test fails, decide which one is wrong: the test or the code. Reread the rule. If the test
   is right, you've found a bug. Write it up in `BUGS.md`, and leave the test failing for now.
6. Once you have three failing tests, and only then, fix the bugs one at a time. After each fix, one
   more test goes green and nothing else changes. Commit each fix on its own.

Before you fix anything, a run of the finished suite looks something like this:

```text
$ uv run pytest -q
..........F........F.......F....
3 failed, 29 passed in 0.08s
```

### The toolkit

Every lesson in this module has a job here:

| Rule | Tool |
|------|------|
| The price list file | `tmp_path`, writing a small CSV in each test |
| A price list and coupons shared by many tests | fixtures |
| Bulk quantities, shipping regions and thresholds | `parametrize` with ids |
| Every refusal | `pytest.raises(ValueError, match=...)` |
| The rates service | `monkeypatch.setattr` or `patch("pricing.fetch_rate")` |
| The confirmation email | `capsys` |
| Coupon expiry | pass `today`; never depend on the real date |

### Things the lessons didn't cover

- **Where a bug hides in a rounding rule.** A rounding mode only matters for a value that's exactly
  halfway between two pennies, so a test needs an input where the exact result ends in 5 in the third
  decimal place. Work one out by hand.
- **`pytest.mark.xfail(strict=True, reason="...")`** marks a test you expect to fail. The suite
  stays green while the bug is known but unfixed, and `strict=True` turns it red the moment the test
  starts passing, reminding you to remove the mark. Use it if you want to commit your tests before
  the fixes. Remove the marks once the bugs are fixed.
- **Coverage.** `uv add --dev pytest-cov`, then `uv run pytest --cov=pricing --cov-report=term-missing`
  lists the lines no test runs. An untested line is a place a fourth bug could hide.

## Stretch goals

- **Full coverage.** Reach 100% line and branch coverage (`--cov-branch`), and say in your README
  what, if anything, that made you add.
- **Test `fetch_rate` itself.** Patch `pricing.urlopen` with a Mock whose return value works as a
  context manager and yields a fake response (an `io.BytesIO` of JSON), and check the URL it asks for.
- **A conftest.py.** Move the shared fixtures into `conftest.py`, and split the suite into one file
  per area: `test_price_list.py`, `test_coupons.py`, `test_quote.py`.
- **Property tests.** With the `hypothesis` library, check rules that hold for any input: a line
  total is never more than the quantity times the unit price, and a discount is never more than the
  subtotal.
- **Mutation testing.** Run `mutmut` against `pricing.py`. It plants bugs automatically, as the drills
  in this module did, and reports the ones your suite didn't notice.

## How it's tested

Automated tests run on every push to your repository. They rely on this:

- `pricing.py`, `test_pricing.py` and `BUGS.md` are at the top of the repository.
- The tests copy your test files (`test_*.py`, `*_test.py`, `conftest.py` and a `tests/` folder,
  if you have one) into an empty folder and run them with pytest against several versions of
  `pricing.py`: your fixed one, a correctly fixed one, the original starter, the fixed one with each
  original bug put back on its own, and the fixed one with other bugs planted in it. Your own
  pytest settings aren't used, and tests marked `xfail` run as ordinary tests.
- During those runs, `fetch_rate` can't reach the network and `quote()` fails if it isn't given
  `today`, so a test that relies on either fails.
- `BUGS.md` must contain the name of each test that fails against the original (for a parametrized
  test, its function name is enough).
- Your `pricing.py` is also checked against the business rules by tests of our own, which say how
  many checks fail but not which, so they don't give the bugs away.
- Your test files are read to check you used fixtures, `parametrize` with ids, `pytest.raises` with
  `match`, `tmp_path`, `capsys`, and `monkeypatch` or `patch`.

## How to submit

Push `pricing.py`, `test_pricing.py`, `BUGS.md` and a short `README.md` (what the project is and the
command that runs the tests) to a GitHub repository, and submit its link on this capstone's page.
Connect the repository there too, and add the workflow file it gives you
(`.github/workflows/pylearn.yml`): the tests above then run on every push, and the page shows the
results.

The review runs your suite three ways: against the original starter, where it must fail exactly the
tests `BUGS.md` names; against your fixed `pricing.py`, where it must pass; and against a set of
further bugs the reviewer plants, most of which it should catch. Then it reads your tests against
the criteria: rules tested at their boundaries, one behaviour per test, clear names, no network or
real clock, mocks only at the boundary, and money compared exactly.
