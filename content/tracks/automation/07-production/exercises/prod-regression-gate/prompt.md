The email triage agent's eval runs in CI on every pull request that touches a prompt. Write the
gate that decides whether the change may merge.

`gate(baseline, candidate, *, min_pass_rate=0.90, max_drop=0.02)` takes two runs, each a dict of
case id to `True` (passed) or `False`, and returns a `GateResult` (in the starter):

- `pass_rate`: the candidate's pass rate. `baseline_rate`: the baseline's.
- `newly_failing`: ids that passed on the baseline and fail on the candidate, in the candidate's
  order. Cases that are new in the candidate aren't newly failing, but they do count towards its
  pass rate.
- `fixed`: ids that failed on the baseline and pass on the candidate, in the candidate's order.
- `reasons`: why the gate fails, as a list of strings, empty when it passes:
  - `"pass rate 85.0% is below the floor of 90.0%"` when the candidate's rate is under `min_pass_rate`;
  - `"pass rate dropped 4.0 points from 96.0%"` when it's more than `max_drop` below the baseline's
    (a drop of exactly `max_drop` is allowed).
- `ok`: `True` when there are no reasons.

```python
baseline = {"t-01": True, "t-02": True, "t-03": False, "t-04": True, "t-05": True}
candidate = {"t-01": False, "t-02": True, "t-03": True, "t-04": True, "t-05": True}
result = gate(baseline, candidate)
result.ok, result.pass_rate, result.newly_failing, result.fixed
# (False, 0.8, ['t-01'], ['t-03'])
result.reasons
# ['pass rate 80.0% is below the floor of 90.0%']
```

The drop is fine here (80% on both), but one case broke while another got fixed, and the floor
catches it. A dropped case shows up in `newly_failing` even when the gate passes, so the CI log can
say which ones to read.
