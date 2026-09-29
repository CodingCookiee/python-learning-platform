Write `clean_filename(name)` that turns whatever a client called a file into a tidy, searchable
name:

- the name (without the extension) in lower case, with every run of characters other than `a–z`
  and `0–9` replaced by a single hyphen, and no hyphens at either end;
- the extension kept, in lower case.

```python
clean_filename("Invoice #1042 (FINAL).PDF")     # "invoice-1042-final.pdf"
clean_filename("  Receipt  Tesco 03-02.jpeg")    # "receipt-tesco-03-02.jpeg"
clean_filename("README")                         # "readme"
```
