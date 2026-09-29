An export job receives CSV lines as a stream: sometimes a list, sometimes a file or a generator
that can only be read once. Write `split_header(rows)`, which returns a tuple `(header, rest)`:

- `header` is the first line.
- `rest` is an **iterator** over the remaining lines, not a list. Reading the header must not read
  anything else from the stream.
- An empty stream raises `ValueError` with the message `"no header row"`.

```python
header, rest = split_header(["id,total", "A1,12.50", "A2,8.00"])
header        # "id,total"
list(rest)    # ["A1,12.50", "A2,8.00"]
```
