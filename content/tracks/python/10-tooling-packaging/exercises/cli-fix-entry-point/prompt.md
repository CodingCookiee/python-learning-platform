`slug.py` turns article titles into URL slugs. The `slugify` function and the parser are fine; the
entry point around them isn't. Tests can't call it, errors land in the output, the exit status is
always 0, and `python slug.py "Hello"` does nothing at all.

Fix `main` and the last lines so that:

- `main(argv)` parses the list it's given (and `sys.argv[1:]` when it's given nothing), and prints
  one slug per title.
- A title with no letters or digits prints `slug: error: '???' has no letters or digits` to
  **stderr**, and the other titles are still converted.
- `main` **returns** `0` if every title worked and `1` if any didn't.
- Running the file as a script calls `main()` and exits with its return code. Importing it runs
  nothing.

```python
main(["Quarterly report: Q3", "Ship it!"])
# prints "quarterly-report-q3" and "ship-it", returns 0

main(["Ship it!", "???", "Done"])
# prints "ship-it" and "done", writes the error for '???' to stderr, returns 1
```

```bash
python slug.py "Hello World" --separator _      # prints hello_world, exit status 0
```
