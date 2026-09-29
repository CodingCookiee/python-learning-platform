Harbour & Co sells homeware online, and a marketplace partner sends them a weekly export of the
orders it took on their behalf. Someone on the partner's side builds that file by hand in a
spreadsheet. Dates come in two formats, prices sometimes carry a `£` and a thousands separator,
emails arrive in capitals with stray spaces, and every week a few rows are simply wrong. Harbour's
current import script crashes on the first bad row, so on a bad week nothing gets imported at all.

You'll build `cleaner.py`: a command-line tool that reads the export, writes every good row to a
clean CSV file, writes every problem to an error report that the partner can fix, and never crashes
because of a bad row. It uses the whole of this module: a small exception hierarchy, exception
groups, careful file reading and writing, context managers, and logging. Build it in your own
editor. The starter contains the sample export and the function signatures the review tests use.

## A sample run

```text
$ python cleaner.py orders-raw.csv
Cleaned orders-raw.csv: 12 rows read
  4 clean rows written to orders-raw-clean.csv
  8 rejected rows, 9 problems written to orders-raw-errors.csv
$ echo $?
1
```

This is the export it read. The file was saved by Excel, so it also starts with a byte order mark
and uses Windows line endings, neither of which you can see here:

```text
Order ID,Date,Email,SKU,Qty,Unit Price,Status
HB-10231,2026-09-21,ada@example.com,MUG-STN,2,12.50,paid
HB-10232,21/09/2026, Grace.Hopper@Example.com ,lamp-02,1,£49.00,Paid
HB-10233,2026-09-22,linus@example.org,TEA-12,three,4.25,paid
HB-10234,2026-09-31,margaret@example.com,MUG-STN,1,12.50,paid

HB-10235,2026-09-22,not-an-email,PEN-05,4,1.20,shipped
HB-10236,2026-09-23,chloe@example.fr,GRINDER-PRO,1,"£1,249.00",paid
HB-10231,2026-09-21,ada@example.com,MUG-STN,2,12.50,paid
HB-10237,2026-09-23,yusuf@example.com,TEA-12,2,4.255,pending
HB-10238,2026-09-24,zoe@example.com,,1,8.00,paid
HB-10239,2026-09-24,sam@example.com,MUG-STN,1,12.50,refunded,gift wrap
HB-10240,2026-09-24,priya@example.com,LAMP-02,0,49.00,paid
,,,,,,
HB-10241,24/09/2026,omar@example.com,TEA-12,6,4.25,PENDING
```

`orders-raw-clean.csv`:

```text
order_id,order_date,email,sku,quantity,unit_price,total,status
HB-10231,2026-09-21,ada@example.com,MUG-STN,2,12.50,25.00,paid
HB-10232,2026-09-21,grace.hopper@example.com,LAMP-02,1,49.00,49.00,paid
HB-10236,2026-09-23,chloe@example.fr,GRINDER-PRO,1,1249.00,1249.00,paid
HB-10241,2026-09-24,omar@example.com,TEA-12,6,4.25,25.50,pending
```

`orders-raw-errors.csv`:

```text
line,order_id,field,value,problem
4,HB-10233,qty,three,must be a whole number
5,HB-10234,date,2026-09-31,must be a real date like 2026-09-21 or 21/09/2026
7,HB-10235,email,not-an-email,must be an email address
7,HB-10235,status,shipped,"must be one of paid, pending, refunded"
9,HB-10231,order_id,HB-10231,duplicate of line 2
10,HB-10237,unit_price,4.255,must have at most 2 decimal places
11,HB-10238,sku,,is required
12,HB-10239,row,,"has 8 fields, expected 7"
13,HB-10240,qty,0,must be at least 1
```

Line 7 has two problems, and both are reported. The empty line 6 and the row of commas on line 14
are skipped without comment.

## The design

| Piece | Kind | Job |
|-------|------|-----|
| `CleanerError` | exception | Base class for everything the cleaner raises on purpose |
| `InputFileError` | `CleanerError` | The file can't be processed at all: missing, or lacking a column |
| `FieldError` | `CleanerError` and `ValueError` | One problem with one field, with `field`, `value` and `problem` attributes |
| `clean_row(row)` | function | Cleans one row, or raises an `ExceptionGroup` of every `FieldError` in it |
| `Summary` | dataclass (in the starter) | The counts that `main()` prints |
| `clean_file(source, clean_path, errors_path)` | function | Reads the export, writes both output files, returns a `Summary` |
| `main(argv)` | function | The command line: works out the file names, prints, returns the exit code |

The split matters. `clean_row` knows nothing about files, so it's easy to test with a dict.
`clean_file` knows nothing about the command line. Only `main` prints or configures logging, so
the module can be imported by Harbour's other tools without side effects.

## Requirements

### Reading the export

- Read the file as UTF-8, dropping a byte order mark if there is one (`utf-8-sig`). If the bytes
  aren't valid UTF-8, log a warning, `orders-raw.csv isn't UTF-8; reading it as cp1252`, and
  decode them as `cp1252`: one of the partner's colleagues still uses an old laptop.
- Match column names after stripping spaces, lowercasing and turning spaces into underscores, so
  `Unit Price`, ` unit price ` and `UNIT_PRICE` are all `unit_price`. The seven required columns are
  `order_id`, `date`, `email`, `sku`, `qty`, `unit_price` and `status`. Extra columns are allowed
  and ignored.
- If a required column is missing, or the file doesn't exist, raise `InputFileError` with a message
  such as `orders-raw.csv is missing columns: qty, status` or `orders-raw.csv not found`, before
  creating any output files.

### Cleaning a row

`clean_row(row)` takes a dict keyed by the normalised column names and returns a dict with the
eight clean columns. Each field is stripped of surrounding spaces first. A field that's empty
after stripping has the problem `is required`.

| Field | Clean value | Problem when it's wrong |
|-------|-------------|-------------------------|
| `order_id` | uppercased; two letters, a hyphen, at least four digits, like `HB-10231` | `must look like HB-10231` |
| `date` | a real date written `2026-09-21` or `21/09/2026` (day first), output as `order_date` in ISO format | `must be a real date like 2026-09-21 or 21/09/2026` |
| `email` | lowercased; something, `@`, something, `.`, something, with no spaces | `must be an email address` |
| `sku` | uppercased; letters and digits in groups joined by single hyphens | `must be letters and digits joined by hyphens` |
| `qty` | a whole number, output as `quantity` | `must be a whole number`, or `must be at least 1` |
| `unit_price` | a `Decimal`, after removing a leading `£` and any `,` separators, written with two decimals | `must be an amount like 12.50`, `must be more than zero`, or `must have at most 2 decimal places` |
| `status` | lowercased; one of `paid`, `pending` or `refunded` | `must be one of paid, pending, refunded` |

`total` is `quantity × unit_price`, with two decimals. If any field has a problem, `clean_row`
raises `ExceptionGroup("invalid row", errors)` with one `FieldError` per problem, in the order of
the table. `FieldError(field, value, problem)` uses the input column name (`qty`, not `quantity`)
and the value after stripping (and uppercasing or lowercasing, where the field does that).

### Rejecting rows

`clean_file` reads the rows and, for each one:

1. skips it silently if every field is empty;
2. rejects it with a single problem, field `row`, value empty, `has 8 fields, expected 7`, if it
   has more or fewer fields than the header;
3. otherwise calls `clean_row`, and rejects it with every `FieldError` from the group;
4. rejects a clean row whose `order_id` and `sku` pair has already been written, with field
   `order_id` and the problem `duplicate of line 2` (the line of the first one);
5. writes the rest to the clean file.

The `line` in the error report is the line of the file the row came from (`reader.line_num`), so
someone can open the export and go straight to it. The `order_id` column shows the row's order id
as it appeared in the file, stripped.

### Never crash on a bad row

A bad row is expected, and it's handled by the steps above. But the cleaner will also meet rows
nobody predicted, and a bug in your code for one odd row mustn't cost Harbour the whole import. Put
the handling of each row inside `try` / `except Exception`, and in the handler:

- log it with `log.exception("line %d: unexpected error while cleaning", line)`,
- reject the row with field `row` and problem `unexpected error: <type>: <message>`,
- carry on with the next row.

That's the only broad `except` in the program. Everywhere else, catch the specific exception you
expect.

### Writing the output

- Both output files go next to the input: `orders-raw.csv` gives `orders-raw-clean.csv` and
  `orders-raw-errors.csv`. Write them as UTF-8 with `csv.DictWriter`, each with a header row, even
  when there's nothing else to write.
- Open all the files you need with `with`, or with an `ExitStack`, so they're closed however the
  run ends.

### The command line

`main(argv)` receives the arguments after the program name and returns the exit code. The starter
ends with `sys.exit(main(sys.argv[1:]))`.

- Without exactly one argument, print `usage: python cleaner.py <orders.csv>` to stderr and return 2.
- On an `InputFileError`, print `error: <message>` to stderr and return 2. No traceback: this is a
  mistake by the person running it, not a bug.
- Otherwise print the three summary lines shown above (with `1 row`, `1 clean row` and so on in the
  singular), and return 0 if every row was clean or 1 if any were rejected, so a scheduled job can
  tell a clean week from a messy one.
- Call `logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")` at the start
  of `main()`, and nowhere else. Every other function logs through `log = logging.getLogger(__name__)`.
  Log each rejected row at `INFO` (`line 7 rejected with 2 problems`), which the default level hides
  but a curious developer can turn on.

## Getting started

1. Copy the starter into `cleaner.py`, and create the sample export with
   `python -c "import cleaner; cleaner.write_sample('orders-raw.csv')"`.
2. Write the exception classes, then the field cleaners one at a time. Try each in the REPL:
   `clean_price("£1,249.00")` should give `Decimal("1249.00")`, and `clean_price("4.255")` should
   raise a `FieldError`.
3. Write `clean_row`, collecting `FieldError`s and raising the group at the end. Check it with the
   dict for line 7: `str(e)` for each member of the group should be `email must be an email
   address` and `status must be one of paid, pending, refunded`.
4. Write `clean_file`: reading and header checks first, then the loop, then the writers. Use
   `except* FieldError` around `clean_row`.
5. Write `main`, run `python cleaner.py orders-raw.csv`, and compare all three outputs with the
   ones above, character for character.

### Things the lessons didn't cover

- **Renaming the header.** After creating a `csv.DictReader`, you can replace its column names by
  assigning a list to `reader.fieldnames`. Every row after that uses the new names.
- **Reading a file you've already decoded.** If you read the bytes and decode them yourself, wrap
  the text in `io.StringIO(text, newline="")` and hand that to `DictReader`.
- **Counting decimal places.** `Decimal("4.255").as_tuple().exponent` is `-3`, the negative of the
  number of digits after the point. `Decimal("NaN")` and `Decimal("Infinity")` parse, so check
  `is_finite()` too.
- **Day-first dates.** `datetime.strptime("21/09/2026", "%d/%m/%Y").date()` parses them, and
  raises `ValueError` for a date that doesn't exist. Check the shape with `re.fullmatch` first, or
  `date.fromisoformat` will accept a few other formats you didn't ask for.
- **Printing an error.** `print("error: ...", file=sys.stderr)` writes to stderr, which is where
  error messages belong, so they don't end up in someone's redirected output.

## Try these

Before you submit, check each of these:

- Delete the `Unit Price` column from the sample: the cleaner prints
  `error: orders-raw.csv is missing columns: unit_price`, exits with 2, and creates no files.
- Run it on a file that doesn't exist, and with no arguments at all. Neither prints a traceback.
- Write a copy of the sample the way the old laptop would, with
  `write_sample("legacy.csv", encoding="cp1252")`: it cleans the same rows, `£` signs and all,
  after one warning.
- Remove every bad row from the sample: the error report holds just its header, the summary says
  `0 rejected rows, 0 problems`, and the exit code is 0.
- In the REPL, `clean_row` on a dict where every field is `"  "` raises a group of seven
  `FieldError`s, all `is required`.
- Temporarily add `1 / 0` to your SKU cleaner: every row that reaches it is rejected with
  `unexpected error: ZeroDivisionError: division by zero`, each one's traceback is logged, and the
  program still finishes and prints its summary. Then take it out again.

## Stretch goals

Pick any you like once the requirements work:

- **Stream it.** Read the input line by line instead of all at once, so a million-row export needs
  no more memory than a ten-row one. The encoding fallback is the tricky part; decide how you'll
  handle a file that turns out not to be UTF-8 halfway through.
- **Never leave half a file.** Write each output to a temporary file in the same folder and rename
  it into place only once the run succeeds (`Path.replace` does that in one step), so a crash never
  leaves a half-written clean file for the next job to import.
- **A verbose flag.** `python cleaner.py -v orders-raw.csv` sets the log level to `INFO`, so every
  rejected row is listed on stderr as the cleaner goes. Module 10 covers `argparse`, but `argv` is a
  list you can check yourself.
- **A JSON summary.** `--json` prints the summary as JSON instead, for a dashboard to read.
- **Group the report.** Add a third file, `orders-raw-problems.csv`, counting how often each field
  and problem occurred, so the partner can see that most of their mistakes are in one column.
- **Tests.** Write `test_cleaner.py` with plain `assert` statements for each field cleaner and for
  `clean_row`. Module 7 shows how to run them with pytest, and how to test `clean_file` with
  temporary folders.

## How to submit

Push `cleaner.py`, the sample export, and a short `README.md` (what the tool does, the command to
run it, and what the exit codes mean) to a GitHub repository, and submit its link on this
capstone's page. The review runs hidden tests against `clean_row`, `clean_file` and `main`, including
exports that are messier than the sample, then reads your code against the criteria: a small
exception hierarchy, every problem in a row reported, no silent `except`, files opened safely with
explicit encodings, exact money, and a module that does nothing until `main()` runs.
