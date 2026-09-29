`apply_renames(folder, renames)` takes a folder and a dict of `{old name: new name}` (the output
of the last drill's `clean_filename`), renames each file, and returns the final names in order.
On the firm's Linux server, two receipts went in and one came out:

```python
apply_renames(folder, {"Receipt.JPG": "receipt.jpg", "RECEIPT.jpg": "receipt.jpg"})
# ["receipt.jpg", "receipt.jpg"]   and the first receipt has been overwritten
```

Fix it so that no file is ever overwritten. When the new name is taken, whether by a file that was
already there or by an earlier rename in the same batch, use the first free name out of
`receipt-2.jpg`, `receipt-3.jpg`, and so on:

```python
apply_renames(folder, {"Receipt.JPG": "receipt.jpg", "RECEIPT.jpg": "receipt.jpg"})
# ["receipt.jpg", "receipt-2.jpg"]   and both receipts are still there
```

A file whose new name is the name it already has stays as it is.
