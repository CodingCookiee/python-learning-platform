`extract_invoice(llm, document)` sends validation errors back to the model until it gets a valid
`Invoice`. It works well on most invoices. Then a supplier sent an invoice with no invoice number
at all, the model kept answering `"invoice_number": ""`, and the loop ran all night: 11,000 calls
before someone killed the worker.

Fix it so it makes **at most `MAX_ATTEMPTS` calls** in total (the first call counts), and when none
of them produces a valid invoice, raises `ExtractionFailed` with the last problems and the last
reply, so the invoice can go to a person's review queue. Keep everything else as it is: the
feedback it sends after a bad reply is already right.

```python
llm = ScriptedLLM([MISSING_NUMBER, MISSING_NUMBER, MISSING_NUMBER])
extract_invoice(llm, "Kiln Supplies, total 1240.50 EUR")   # raises ExtractionFailed
len(llm.calls)                                            # 3
```
