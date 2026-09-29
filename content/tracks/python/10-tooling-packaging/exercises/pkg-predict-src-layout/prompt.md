This program builds a real src-layout package on disk: `src/invoicer/` with `__init__.py`, `cli.py`
and `__main__.py`. Then it imports it three ways: with only the project root on `sys.path`, with
`src/` on `sys.path` (which is what installing does), and the way `python -m invoicer` would.

Follow each import: which files run, in what order, what `__name__` is in each, and what the
`-m` run exits with. Type exactly what the program prints.
