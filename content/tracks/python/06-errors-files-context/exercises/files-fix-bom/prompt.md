`statement_columns(path)` reads the header line of a bank statement exported from Excel, so the
importer can find each column by name. The importer keeps reporting that the `Date` column is
missing, even though it's plainly there when you open the file.

Fix it so that it returns the column names without surrounding whitespace:

```python
# The first line of the export: Date,Description,Amount
statement_columns(path)   # ["Date", "Description", "Amount"]
```

The exports are UTF-8, written by Excel with a byte order mark at the start and Windows line
endings. Files from other tools have no byte order mark, and must still work. Column names can
contain accented letters, such as `Référence`.
