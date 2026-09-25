The shop builds page URLs from collection titles: `"Summer Sale 2026"` becomes `summer-sale-2026`.
The current `slugify(title)` works for the titles the team tried, but it's a pile of patches, and it
breaks as soon as a title contains four spaces in a row or a tab.

Rewrite it using `split()` and `join()`, so that any run of whitespace, anywhere, becomes a single
`-`, with nothing left over at either end:

```python
slugify("  Summer   Sale 2026 ")    # "summer-sale-2026"
slugify("New\tarrivals\n")          # "new-arrivals"
```
