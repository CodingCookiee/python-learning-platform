Write `sort_by_extension(folder)` that tidies a downloads folder. Every file directly inside
`folder` moves into a subfolder named after its extension, in lowercase and without the dot. Files
with no extension go into `other`. The function returns how many files went into each subfolder.

Before:

```text
invoice-1042.PDF
report.csv
data.CSV
photo.jpg
README
```

```python
sort_by_extension(folder)   # {"pdf": 1, "csv": 2, "jpg": 1, "other": 1}
```

After, `report.csv` and `data.CSV` are in `csv/`, and so on. Files keep their names and contents.
Folders that were already there are left alone, and their contents aren't touched or counted.
`folder` may be a string or a `Path`.
