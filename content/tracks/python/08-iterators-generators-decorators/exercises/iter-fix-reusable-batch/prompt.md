The finance dashboard shows the wrong totals for every batch of orders:

```python
batch = OrderBatch([("A1", 12.5), ("A2", 8.0), ("A3", 30.0)])
batch_summary(batch)   # {"orders": 3, "total": 0}  (the total should be 50.5)
```

`batch_summary` is correct: it's fine for it to loop over the batch twice. The bug is in
`OrderBatch`. Fix it so that every loop over a batch sees all of its orders, including two loops
nested inside each other. When you're done:

```python
batch_summary(batch)   # {"orders": 3, "total": 50.5}
```

Don't change `batch_summary`.
