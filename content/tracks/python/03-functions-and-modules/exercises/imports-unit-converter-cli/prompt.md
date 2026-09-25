Build a small distance converter that is both a library and a command-line tool. `TO_METRES` is
given: it says how many metres one of each unit is.

**The library** (what an importer uses):

- `convert(value, from_unit, to_unit)` returns the converted distance, rounded to 2 decimal places.
  An unknown unit raises `ValueError("Unknown unit: <unit>")`.
- `parse_request(line)` turns `"12.5 km to mi"` into `(12.5, "km", "mi")`. A line that isn't
  exactly `<number> <unit> to <unit>` raises `ValueError('Expected "<number> <unit> to <unit>"')`.

```python
convert(12.5, "km", "mi")          # 7.77
parse_request("3 ft to cm")        # (3.0, "ft", "cm")
```

**The program** (`main()`, run only when the file is run as a script): read request lines until a
blank line. For each one, print the result as `{value:g} {from} = {result:.2f} {to}`, or, if either
function raises `ValueError`, print `Error: ` followed by its message and carry on.

```text
> 12.5 km to mi
12.5 km = 7.77 mi
> 3 ft to cm
3 ft = 91.44 cm
> 1 parsec to m
Error: Unknown unit: parsec
>
```

Use `"> "` as the `input()` prompt. Importing the file must not run the program or print anything.

Exceptions get a full module later. For now, this is all you need to catch one and keep going:

```python norun
try:
    value, from_unit, to_unit = parse_request(line)
    ...
except ValueError as error:
    print(f"Error: {error}")      # str(error) is the message it was raised with
```
