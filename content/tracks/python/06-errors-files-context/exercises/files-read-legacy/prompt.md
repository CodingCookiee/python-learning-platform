A café chain's branches send their daily sales exports in two encodings: the new tills write UTF-8,
and one branch still runs an old accounting package that writes Windows `cp1252`. Write
`read_export(path)` that returns a file's text, whichever encoding it uses:

- decode it as UTF-8,
- if the bytes aren't valid UTF-8, decode them as `cp1252` instead.

```python
# A file the old package wrote: "Café Lumière,€4.50\n" encoded as cp1252
read_export(path)     # "Café Lumière,€4.50\n"
```

This works because cp1252 text containing accented letters is almost never valid UTF-8 by
accident, so a failed UTF-8 decode is a reliable sign. Don't use `errors="replace"`, which would
turn every accented letter into `�`, and let any other error, such as a missing file, reach the
caller.
