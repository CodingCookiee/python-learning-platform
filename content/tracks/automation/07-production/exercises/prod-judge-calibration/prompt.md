Before the support bot's judge gates any release, you check it against a person. Someone at the
client labelled 50 answers pass or fail, and the judge graded the same 50.

Write `calibrate(human, judge)`. Both arguments map a case id to `True` (pass) or `False` (fail).
Return a `Calibration` (in the starter) with:

- `agreement`: the share of cases where the two agree, from 0 to 1.
- `false_passes`: the ids the judge passed and the person failed, in the order of `human`.
- `false_fails`: the ids the judge failed and the person passed, in the order of `human`.
- `false_pass_rate`: of the answers the person **failed**, the share the judge let through
  (`0.0` when the person failed none). This is the number that tells you how many bad answers your
  eval would wave through.

If the two don't cover exactly the same ids, raise `ValueError` naming the ids that are missing
from either side: comparing different sets of cases gives numbers that mean nothing.

```python
human = {"c1": True, "c2": False, "c3": True, "c4": False, "c5": True}
judge = {"c1": True, "c2": True, "c3": True, "c4": False, "c5": False}
calibrate(human, judge)
# Calibration(agreement=0.6, false_passes=['c2'], false_fails=['c5'], false_pass_rate=0.5)
```
