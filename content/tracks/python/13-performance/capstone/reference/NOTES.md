# Making build_report fast

Measured with `python report.py --time` on the default sample (5,000 orders), on a Windows 11
desktop with CPython 3.14, with nothing else running. The fast version is
`--time --repeat 5`, best run. (This is the reference solution, written in one go, so only the
starter and the final version were timed. A learner's table has a time on every row.)

| # | Change | build_report |
|---|--------|--------------|
| 0 | The starter | 12.78 s |
| 1 | `parse_day` uses `date.fromisoformat` instead of `strptime` | not measured |
| 2 | The day-by-day section groups orders by day in one pass, instead of scanning every order for every day | not measured |
| 3 | `find_product` replaced by a dict from SKU to product, built once per call | not measured |
| 4 | `find_customer` replaced by a dict from id to country, and VAT parsed once into a dict | not measured |
| 5 | Returning customers counted with a `Counter`; discontinued SKUs in a set | not measured |
| 6 | Business days cached per (placed, shipped) pair for the call; every section folded into one pass over the orders; the report built as a list and joined | 0.057 s |

Final speed-up: 12.78 s / 0.057 s = **223 times faster**.

## The changes

1. **Dates.** The first profile was dominated by `_strptime`: 480,000 calls and over 60% of the
   time, almost all from `parse_day` in the shipping and day-by-day sections. The dates are all
   ISO text, so `date.fromisoformat` does the same job without interpreting a format string on
   every call.
2. **Day by day.** With parsing cheap, the profile showed `parse_day` still called 460,000 times:
   the day-by-day loop scanned all 5,000 orders for each of 92 days. Grouping the orders by their
   `placed` text once makes that section linear.
3. **Products.** `find_product` was next, at 50,000 calls each scanning up to 2,000 products. A
   dict from SKU to unit price and name, built at the start of the call, turns each lookup into
   one hash.
4. **Customers and VAT.** The same fix for `find_customer` (5,000 calls over 5,000 customers), and
   `vat_rate` re-split the VAT table for every order, so it is parsed once into a dict.
5. **Membership.** `customer_id in seen` was a list scan that grew with every customer, and
   `sku in discontinued` scanned 300 SKUs per line. A `Counter` of orders per customer answers
   "at least once" and "more than once" together; the discontinued SKUs go in a set.
6. **One pass.** What was left was the repeated work across sections: `order_total` was computed
   three times per order, and `business_days` walked day by day for every order although there
   are only a few hundred distinct (placed, shipped) pairs. Everything is now collected in one
   loop over the orders, with a cache that lives for one call, and the text is joined once at the
   end. The after profile shows `make_sample` (which isn't part of `build_report`) costing more
   than the report itself, so this is where I stopped.

`test_report.py` compares the output with the starter's for the default sample, the 1,000-order
sample and three other seeds, and checks `parse_day`, the VAT rates and `business_days` against
the originals.
