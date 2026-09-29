Ledgerline's keyword search crashed in production with `ZeroDivisionError: division by zero` the
first time a customer searched for a word that isn't in any help article ("VAT"). And a colleague
noticed a second problem: "error" is in every article, so its weight is exactly `0.0`, and a
query made only of common words scores every article 0.

Fix `idf(term, docs)` by switching it to the BM25 IDF, so it:

- never raises, including for a term in no document and for an empty corpus;
- is always greater than 0, even for a term in every document;
- is higher for rarer terms.

`docs` is a list of documents, each a list of tokens; the document frequency counts documents
that contain the term, however many times.

```python
docs = [["export", "xero", "error"], ["invoice", "error"], ["reminder", "error"]]
idf("xero", docs)     # 0.9808...
idf("error", docs)    # 0.1335...  (the starter says 0.0)
idf("vat", docs)      # 2.0794...  (the starter raises ZeroDivisionError)
```
