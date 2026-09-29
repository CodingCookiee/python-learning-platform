Castlegate's bot shows a "Source" link under every answer. A tenant complained that the answer
about deposits linked to the page about repairs, and the logs show the occasional `IndexError`
too. The prompt is built like this, numbering the sources from 1:

```python
for n, chunk in enumerate(chunks, start=1):
    ...  # <source id="{n}" title="...">
```

Fix `resolve_citations(answer, chunks)` so it returns the chunks an answer cites:

- citation `[n]` refers to the chunk the prompt numbered `n`;
- each chunk appears once, in the order it's first cited;
- numbers that don't match a source (0, or more than the number of chunks) are ignored, never an
  error and never another chunk.

```python
chunks = [deposit_protection, unprotected_deposits, asking_for_repairs]
resolve_citations("Your landlord has 30 days to protect it [1].", chunks)
# [deposit_protection]  (the starter returns [unprotected_deposits])
```
