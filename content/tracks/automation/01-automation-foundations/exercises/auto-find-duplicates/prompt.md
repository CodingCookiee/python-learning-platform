Clients upload the same statement twice under different names. Write `find_duplicates(folder)`
that finds files with **identical contents** anywhere inside `folder`, subfolders included.

Return a list of groups. Each group is a list of two or more paths, written relative to `folder`
with forward slashes (`"2026/march/statement.pdf"`), sorted. The list of groups is sorted too.
Files with unique contents don't appear at all.

```python
# Inbox/statement-march.pdf and Inbox/scans/Scan 14.pdf hold the same bytes
find_duplicates(inbox)
# [["scans/Scan 14.pdf", "statement-march.pdf"]]
```

Report only; don't delete anything.
