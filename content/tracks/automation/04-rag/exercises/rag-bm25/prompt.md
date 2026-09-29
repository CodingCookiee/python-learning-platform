Build the keyword half of Ledgerline's search: `BM25(docs, k1=1.5, b=0.75)`, where `docs` is a
list of help-article strings. Use the starter's `tokenise` for both the documents and the queries.

- **`scores(query)`** returns one BM25 score per document, as floats, in document order. A
  document's score is the sum, over the query's **distinct** tokens, of
  `idf(term) * tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl / avgdl))`, where `tf` is how many times
  the term appears in the document, `dl` is the document's length in tokens, `avgdl` is the average
  length, and `idf(term) = log(1 + (N - df + 0.5) / (df + 0.5))` for `N` documents of which `df`
  contain the term. Terms a document doesn't contain add nothing.
- **`search(query, k=5)`** returns up to `k` pairs `(index, score)` for documents that score more
  than 0, highest first, equal scores in document order.
- Work out the document frequencies, lengths and average length once, in `__init__`. An empty
  corpus has no scores, and an empty document is fine.

```python
articles = [
    "Exporting to Xero: connect your Xero account in Settings, then export invoices.",
    "Error E-4012 means the Xero connection expired. Reconnect Xero and export again.",
    "Exporting to CSV: download all invoices as a spreadsheet.",
    "Error E-2001 means a card payment failed. Ask the client to update their card.",
    "Payment reminders are sent 3 and 10 days after the due date.",
    "Change the invoice number prefix in Settings, under Invoices.",
]
index = BM25(articles)
[round(s, 3) for s in index.scores("Error E-4012 when I export to Xero")]
# [2.465, 4.768, 0.0, 0.918, 0.0, 0.0]
[(i, round(s, 3)) for i, s in index.search("Error E-4012 when I export to Xero", k=2)]
# [(1, 4.768), (0, 2.465)]
```
