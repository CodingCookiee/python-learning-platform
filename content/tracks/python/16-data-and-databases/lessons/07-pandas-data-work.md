---
slug: pandas-data-work
title: pandas for data work
summary: Load, clean, group, merge, pivot and export tabular data with pandas, and decide when a job belongs in SQL instead.
minutes: 50
exercises:
  - pandas-load-orders
  - pandas-clean-leads
  - pandas-predict-merge-groupby
  - pandas-loop-to-groupby
  - pandas-sales-pivot
  - pandas-weekly-summary
---

Finance emails you an export from the old shop system: a CSV where region names are spelled three
ways, some totals say `n/a`, and one order appears twice. They want revenue per region per month
by this afternoon. You could load it into SQLite and write SQL, but first it has to be cleaned,
and at the end it has to be reshaped into a table with months across the top. **pandas** is the
Python library for exactly this: tables in memory, with fast column operations for cleaning,
grouping, joining and reshaping.

## DataFrames and Series

A **DataFrame** is a table: named columns, each holding one type, plus an **index** labelling the
rows (0, 1, 2… unless you choose otherwise). Each column is a **Series**, backed by a numpy array
(module 13), so an operation on a column runs over every row at once, in C:

```python
import pandas as pd

orders = pd.DataFrame([
    {"order_id": 1001, "customer": "Acme", "region": "North", "total": 120.50},
    {"order_id": 1002, "customer": "Globex", "region": "South", "total": 75.00},
    {"order_id": 1003, "customer": "Acme", "region": "North", "total": 80.00},
    {"order_id": 1004, "customer": "Initech", "region": "East", "total": 310.25},
])

orders["with_vat"] = (orders["total"] * 1.2).round(2)   # a new column from a whole column
big = orders[orders["total"] > 100]                       # rows where the condition is True
big[["order_id", "customer", "with_vat"]]
```

- `df["col"]` is one column (a Series); `df[["a", "b"]]` is a smaller DataFrame.
- `df[condition]` keeps the rows where a Series of booleans is `True`. Combine conditions with `&`
  and `|`, with brackets round each part: `df[(df["total"] > 100) & (df["region"] == "North")]`.
- `df.loc[row_label, "col"]` reads or writes one cell; `len(df)` counts rows; `df.dtypes` lists
  each column's type.

> [!JS]
> Coming from JavaScript: `orders.filter(o => o.total > 100).map(o => o.total * 1.2)` becomes
> `orders[orders["total"] > 100]["total"] * 1.2`. There's no callback per row: you write an
> expression about whole columns, and pandas runs it over all of them.

## Loading data

`pd.read_csv` reads a file path, a URL or any file-like object; for text you already have in a
string, wrap it in `io.StringIO`. It guesses each column's type, and you correct the guesses:
`parse_dates` turns text into real timestamps, and `dtype` pins a column's type.

```python
import io

import pandas as pd

export = """order_id,sku,placed_on,region,total
1001,00417,2026-09-01,North,120.50
1002,00990,2026-09-02,South,75.00
1003,00417,2026-09-08,North,80.00
"""

guessed = pd.read_csv(io.StringIO(export))
fixed = pd.read_csv(io.StringIO(export), parse_dates=["placed_on"], dtype={"sku": str})

guessed["sku"].tolist(), fixed["sku"].tolist(), str(fixed["placed_on"].dtype)
```

Left to guess, pandas read the SKU `00417` as the number 417, which isn't the same product code.
Identifiers that happen to be digits (SKUs, phone numbers, postcodes) should always be read as
text. From a list of dicts or tuples you already have, `pd.DataFrame(records)` does the same job.

## Cleaning: types, missing values, duplicates

Real exports are messy. The tools for fixing them work on whole columns:

- `.str` gives string methods for every value: `.str.strip()`, `.str.lower()`, `.str.title()`,
  `.str.contains(...)`.
- `pd.to_numeric(column, errors="coerce")` converts to numbers and turns anything that isn't one
  into **NaN**, pandas' marker for a missing value (`None` in a text column).
- `.isna()` finds missing values, `.dropna(subset=[...])` drops rows missing them, and
  `.fillna(value)` fills them in.
- `.drop_duplicates(subset=[...], keep="last")` removes repeated rows, judging by those columns.

```python
import io

import pandas as pd

export = """order_id,customer,region,total
1001,Acme, north ,120.50
1002,Globex,South,
1003,Acme,NORTH,80
1003,Acme,NORTH,80
1004,Initech,East,n/a
"""

orders = pd.read_csv(io.StringIO(export))
orders["region"] = orders["region"].str.strip().str.title()
orders["total"] = pd.to_numeric(orders["total"], errors="coerce")
orders = orders.drop_duplicates(subset=["order_id"])
missing_total = orders[orders["total"].isna()]["order_id"].tolist()
orders = orders.dropna(subset=["total"]).reset_index(drop=True)

orders, missing_total
```

Every step returns a **new** column or DataFrame, so assign the result back: `orders =
orders.drop_duplicates(...)`, `orders["region"] = ...`. (pandas 3 made this the only way that
works: changing a filtered piece of a DataFrame never changes the original.) `reset_index(drop=True)`
renumbers the rows after some were removed.

Assigning a column does change the DataFrame you assign into, though. A function that's handed a
DataFrame shouldn't change its caller's data, so start it with `df = df.copy()`, or build the new
columns with `df.assign(region=...)`, which returns a new DataFrame.

> [!WARNING]
> pandas skips NaN in sums, and the sum of nothing is `0`. SQL's `sum()` of only NULLs is NULL.
> A region whose totals were all `n/a` reports revenue of 0.0 in pandas, which looks like a real
> number. Decide what missing means, and count missing values, before you total anything.

## Grouping and aggregating

`groupby` is SQL's `GROUP BY`. Pick the grouping columns, then aggregate. Named aggregation,
`.agg(new_name=("column", "function"))`, gives each result column a name of its own:

```python
import pandas as pd

sales = pd.DataFrame({
    "region": ["North", "South", "North", "East", "South", "North"],
    "placed_on": pd.to_datetime(["2026-08-28", "2026-09-02", "2026-09-08", "2026-09-09", "2026-09-15", "2026-09-21"]),
    "total": [120.5, 75.0, 80.0, 310.25, 42.0, 99.5],
})

by_region = (
    sales.groupby("region", as_index=False)
    .agg(orders=("total", "count"), revenue=("total", "sum"), biggest=("total", "max"))
    .sort_values("revenue", ascending=False)
)

sales["month"] = sales["placed_on"].dt.to_period("M").astype(str)
monthly = sales.groupby(["region", "month"])["total"].sum()

by_region, monthly.to_dict()
```

`as_index=False` keeps the group columns as ordinary columns instead of moving them into the index;
`.reset_index()` does the same afterwards. The `.dt` accessor does for dates what `.str` does for
text: `.dt.year`, `.dt.day_name()`, and `.dt.to_period("M")` for "the month this falls in".

## Merging DataFrames

`pd.merge` is a SQL join. `how="inner"` keeps matching rows only, `how="left"` keeps every row of
the left DataFrame, with NaN where the right one had no match, and `on` names the key:

```python
import pandas as pd

orders = pd.DataFrame({"order_id": [1001, 1002, 1003, 1004], "customer_id": [1, 2, 1, 9], "total": [120.5, 75.0, 80.0, 42.0]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "name": ["Acme", "Globex", "Initech"], "country": ["UK", "DE", "UK"]})

joined = pd.merge(orders, customers, on="customer_id", how="left", validate="many_to_one", indicator=True)
unmatched = joined[joined["_merge"] == "left_only"]["order_id"].tolist()
joined[["order_id", "name", "country", "total"]], unmatched
```

Order 1004 names customer 9, who doesn't exist, so its customer columns are NaN, and
`indicator=True` added a `_merge` column that says so. `validate="many_to_one"` makes the merge
raise if a customer id appears twice on the right, which would silently duplicate orders and
inflate every total: the same row-multiplication trap as a SQL join.

## Pivot tables

A **pivot** turns the values of one column into column headings: months across the top, regions
down the side. `pivot_table` groups, aggregates and reshapes in one call:

```python
import pandas as pd

sales = pd.DataFrame({
    "region": ["North", "South", "North", "East", "South", "North"],
    "month": ["2026-08", "2026-09", "2026-09", "2026-09", "2026-09", "2026-10"],
    "total": [120.5, 75.0, 80.0, 310.25, 42.0, 99.5],
})

sales.pivot_table(index="region", columns="month", values="total", aggfunc="sum", fill_value=0)
```

`fill_value=0` fills the combinations that had no sales; without it they're NaN. Add
`margins=True` for a row and column of totals.

## Exporting

A DataFrame converts to everything else you need. With no path, `to_csv` returns the CSV as a
string, which is handy for emails, HTTP responses and tests:

```python
import sqlite3

import pandas as pd

report = pd.DataFrame({"region": ["North", "South"], "orders": [3, 2], "revenue": [300.0, 117.0]})

csv_text = report.to_csv(index=False)       # or report.to_csv("report.csv", index=False)
records = report.to_dict("records")         # [{"region": "North", ...}, ...], e.g. for JSON

conn = sqlite3.connect(":memory:")
report.to_sql("region_report", conn, index=False)
back = pd.read_sql_query("SELECT region, revenue FROM region_report WHERE orders >= ?", conn, params=(3,))

print(csv_text)
records, back
```

`index=False` leaves the row numbers out of the file. `to_json(orient="records")`, `to_excel(...)`
(with the `openpyxl` package installed) and `to_parquet(...)` are the other common ones.

## SQL or pandas?

Both can filter, join and group, so the choice is about where the data lives and what happens
next:

| Reach for SQL when… | Reach for pandas when… |
|---------------------|------------------------|
| The data is in a database, and there's a lot of it: filter and aggregate where it lives, and move only the answer | The data arrives as files (CSV, Excel, JSON exports) and needs cleaning first |
| Many users or processes read and write it at once, and it must obey constraints | You're exploring: trying groupings, looking at distributions |
| The result feeds an application (an API endpoint, a page) | The result is a report, a pivot, a chart or a file |
| Correctness under concurrency matters (transactions) | The reshaping is awkward in SQL: pivots, rolling windows, filling gaps |

Very often the answer is both, in that order: SQL reduces millions of rows to the thousands you
need, and pandas shapes those into the report. `pd.read_sql_query(sql, conn, params=...)` is the
bridge, and the parameters rule from lesson 3 still applies to it.

```python
import sqlite3

import pandas as pd

conn = sqlite3.connect(":memory:")
conn.executescript("""
    CREATE TABLE orders (id INTEGER PRIMARY KEY, region TEXT, placed_on TEXT, status TEXT, total_cents INTEGER);
    INSERT INTO orders (region, placed_on, status, total_cents) VALUES
        ('North', '2026-09-01', 'paid', 12050), ('South', '2026-09-02', 'paid', 7500),
        ('North', '2026-09-15', 'refunded', 8000), ('East', '2026-10-01', 'paid', 31025),
        ('North', '2026-10-03', 'paid', 9950);
""")

monthly = pd.read_sql_query(
    """
    SELECT region, substr(placed_on, 1, 7) AS month, sum(total_cents) / 100.0 AS revenue
    FROM orders WHERE status = ? GROUP BY region, month
    """,
    conn,
    params=("paid",),
)
monthly.pivot_table(index="region", columns="month", values="revenue", fill_value=0)
```

```quiz
question: "Your orders table has 40 million rows and you need last month's revenue per region as a small chart. What's the sensible split?"
options:
  - Load the whole table into pandas with read_sql_query, then filter and group
  - Filter and GROUP BY in SQL, then read the few result rows into pandas to plot
  - Do everything in pandas, because pandas is faster than SQL
answer: 1
explain: "Moving 40 million rows into memory is the slow part. Let the database filter and aggregate where the data lives, and hand pandas only the result."
```

## Where this leaves you

A DataFrame is a table of typed columns, and you work on whole columns at once. `read_csv` loads
files (pin identifier columns to `str` and parse the dates), `.str`, `to_numeric(errors="coerce")`,
`dropna` and `drop_duplicates` clean them, `groupby().agg()` summarises, `merge` joins (validate
it), `pivot_table` reshapes, and `to_csv`, `to_dict` and `to_sql` export. Missing values sum to 0
in pandas but NULL in SQL, so count them first. Use SQL where the data lives and pandas for shaping
what comes out. The drills end with a weekly report built from a database, which is most of what
the black belt grading asks for.
