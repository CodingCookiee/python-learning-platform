Not every enquiry is a client worth taking. After each discovery call, score it on the four
classic questions: is there a **budget**, are you talking to the person with the **authority** to
say yes, is the **need** worth the price, and is there a **timeline**?

Write `qualify(notes, *, min_budget)`. `notes` is a dict, and every key is optional (missing means
unknown):

| Key | Criterion (25 points each) is met when |
|-----|----------------------------------------|
| `budget` | it's known and at least `min_budget` |
| `decision_maker` | it's `True` (they sign the order) |
| `monthly_pain` | it's known and a year of it (× 12) is at least `min_budget` |
| `start_within_days` | it's known and at most 90 |

`red_flags` is a list of strings (default empty).

Return a dict:

- `"score"`: 0 to 100.
- `"unknowns"`: the criteria whose value was missing or `None`, as `"budget"`, `"authority"`,
  `"need"` and `"timeline"`, in that order. These are the questions for your follow-up email.
- `"verdict"`: `"qualified"` when the score is at least 75 and the budget criterion is met;
  otherwise `"follow up"` when the score is at least 50; otherwise `"not now"`. Then the red
  flags: two or more make it `"decline"`, whatever the score, and exactly one moves the verdict one
  step down (`"qualified"` becomes `"follow up"`, which becomes `"not now"`).

```python
qualify({"budget": Decimal("6000"), "decision_maker": True, "monthly_pain": Decimal("900"),
         "start_within_days": None, "red_flags": []}, min_budget=Decimal("5000"))
# {"score": 75, "verdict": "qualified", "unknowns": ["timeline"]}
```

The amounts are examples, in whatever currency you work in.
