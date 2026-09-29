Each branch of a bakery chain sends a file with one daily sales total per line.
`combine_branch_totals(paths, output)` reads all the branch files side by side and writes one line
per day to `output`, with every branch's total for that day separated by commas. It returns the
number of days written, stopping at the shortest file.

It works, and it does close every file, but the bookkeeping is all by hand: a list of open files,
a `try`/`finally`, and a loop of `close()` calls. Refactor it to use `contextlib.ExitStack` so that
`with` does the closing, and no `close()` calls are left.

```python
# leeds.txt: 1200.50, 980.00, 1105.25 (one per line)
# york.txt:  860.00, 910.40, 1010.00
combine_branch_totals([leeds, york], output)    # 3
```

```text
1200.50,860.00
980.00,910.40
1105.25,1010.00
```

Everything else should behave exactly as before, including when one of the branch files is
missing: the `FileNotFoundError` still reaches the caller, and every file that was opened is still
closed.
