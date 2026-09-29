The billing service renders invoice PDFs, and the renderer can only handle a few at once. Rather
than start one task per invoice, it should use a fixed pool of workers. Write
`process_all(jobs, handle, *, workers)`:

- Put the jobs in an `asyncio.Queue`, and start exactly `workers` worker tasks. Each worker keeps
  taking the next job and running `await handle(job)` until there are none left.
- Return the results as a list, in the same order as `jobs`, whatever order they finished in.
- If a handler raises, `process_all` must raise too (the error on its own, or inside an
  `ExceptionGroup`), rather than wait forever for a job that will never be done.

```python
await process_all(invoices, render_pdf, workers=3)
# ["INV-1.pdf", "INV-2.pdf", ..., "INV-10.pdf"]: ten invoices, never more than three rendering at once
```
