Build the eval runner the rest of the module uses. `run_eval(system, cases, scorers)` runs every
case through the system under test and scores it:

- `system` is a function from a case's `"input"` to an output string (the support bot, the
  invoice extractor, or anything else).
- `cases` are dicts with `"id"`, `"input"`, `"expected"`, `"scorer"` (a name) and, optionally,
  `"tags"` (a list of strings).
- `scorers` maps names to scorer functions: `scorer(output, expected)` returns a `Score`.

It returns an `EvalReport` holding one `CaseResult` per case, in order (both in the starter):

- A passing or failing score is recorded with its reason and the output.
- An exception from the system fails that case with the reason `error: <ExceptionType>: <message>`
  and `output=None`, and the run carries on.
- A case naming a scorer that doesn't exist is a mistake in the dataset, not a failed case: raise
  `ValueError` naming the case's id and the scorer, **before** calling the system at all.

Then finish `EvalReport`: `pass_rate` (the share of passing cases, `0.0` for none), `by_tag` (a
dict of each tag to its pass rate) and `failures` (the failing results, in order).

```python
cases = [
    {"id": "refund-window", "input": "How long do refunds take?", "expected": ["14 days"], "scorer": "contains", "tags": ["refunds"]},
    {"id": "ship-ireland", "input": "Do you ship to Ireland?", "expected": ["Ireland"], "scorer": "contains", "tags": ["shipping"]},
]
report = run_eval(support_bot, cases, {"contains": contains})
report.pass_rate                    # 0.5, when the bot times out on Ireland
report.by_tag                       # {"refunds": 1.0, "shipping": 0.0}
report.failures[0].reason           # "error: TimeoutError: model took too long"
```
