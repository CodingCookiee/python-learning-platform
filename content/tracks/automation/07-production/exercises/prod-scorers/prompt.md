Write the four scorers the support bot's eval uses. Each takes the output and the case's
expectation and returns a `Score(passed, reason)` (in the starter). The reason is `"ok"` when the
score passes, and says what was wrong when it doesn't.

- `exact(output, expected)`: passes when the two are equal after `normalise` (in the starter).
- `contains(output, expected)`: `expected` is one phrase or a list of phrases, and every one must
  appear in the output, compared after `normalise`. The reason for a failure names each missing
  phrase.
- `matches(output, pattern)`: passes when the regular expression is found anywhere in the output.
- `within(output, expected, tolerance=0.01)`: finds the first number in the output (thousands
  commas allowed, as in `1,240.50`) and passes when it's within `tolerance` of `expected`. No
  number at all fails with a reason that says so; a wrong number fails with a reason that includes
  the number found.

```python
contains("Refunds reach your card within 14 days.", ["14 days", "card"])
# Score(passed=True, reason='ok')

contains("Refunds take a while.", ["14 days", "card"])
# Score(passed=False, reason="missing '14 days', 'card'")

within("The total is €1,240.50", 1240.5)
# Score(passed=True, reason='ok')
```
