Every change to Ledgerline's retrieval (chunk size, model, `k`, the reranker) runs the eval, and
CI should fail if the change makes things worse. Write
`compare_runs(baseline, current, tolerance=0.02, critical=())`, which returns a `Report` (the
dataclass in the starter).

A run is a dict from question id to the **rank of the first relevant chunk** (an int from 1), or
`None` if no relevant chunk was found in the top k.

- Both runs must cover exactly the same questions: otherwise raise `ValueError` naming the ids
  that are in only one of them.
- `recall_before` and `recall_after` are the hit rates (the share of questions whose rank isn't
  `None`), and `mrr_before` and `mrr_after` the mean of `1 / rank` (0 for `None`), all rounded to
  3 decimal places.
- `regressed`: questions found before and not now. `fixed`: not found before and found now. Both
  sorted.
- `critical_failures`: the questions in `critical` that were found before and are now missed or
  ranked lower (a bigger number), sorted.
- `ok` is true when neither average drops by more than `tolerance`
  (`recall_after >= round(recall_before - tolerance, 3)`, and the same for MRR) and there are no
  critical failures.

```python
baseline = {"q01": 1, "q02": 2, "q03": None, "q05": 1, "q06": 3}
current = {"q01": 1, "q02": None, "q03": 2, "q05": 1, "q06": 1}
compare_runs(baseline, current, critical={"q02"})
# Report(recall_before=0.8, recall_after=0.8, mrr_before=0.567, mrr_after=0.7,
#        regressed=["q02"], fixed=["q03"], critical_failures=["q02"], ok=False)
```
