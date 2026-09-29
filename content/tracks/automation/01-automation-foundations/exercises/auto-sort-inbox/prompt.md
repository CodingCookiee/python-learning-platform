Write `sort_inbox(inbox, rules, *, dry_run=False)` for the bookkeeping firm. `inbox` is a `Path`,
and `rules` maps a folder name to the extensions that belong in it:

```python
RULES = {
    "invoices": [".pdf"],
    "receipts": [".jpg", ".jpeg", ".png"],
    "spreadsheets": [".csv", ".xlsx"],
}
```

For every **file** directly inside `inbox`:

- move it to `inbox / <folder> / <same name>`, matching the extension case-insensitively;
- files that match no rule go to a folder called `other`;
- leave subfolders and hidden files (names starting with `.`) where they are;
- create folders only when something moves into them.

Return the plan: a list of `(file name, folder)` pairs, sorted by file name. With `dry_run=True`,
return the same plan without moving anything or creating any folder.

```python
sort_inbox(inbox, RULES)
# [("IMG_4411.JPG", "receipts"), ("march.pdf", "invoices"), ("notes.txt", "other")]
```

Assume no two files will collide in a destination folder (the next drill deals with that).
