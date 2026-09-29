The support bot's judge replies with a JSON verdict, `{"reason": "...", "score": 1-5}`. Most of the
time. Sometimes it wraps the JSON in a code fence or adds "Here is my verdict:" in front, and once
it returned `"score": 4.5`, which crashed the report two steps later.

Write `parse_verdict(text)`, which returns a `Verdict(reason, score)` (in the starter):

- The JSON object is everything from the first `{` to the last `}` in the text, so text or a fence
  around it is ignored.
- `score` must be a whole number from 1 to 5: an `int`, not a float, a string or a boolean.
- `reason` must be a string that isn't empty or only spaces.
- Anything else (no JSON, invalid JSON, a missing field, a bad value) raises `JudgeError` (in the
  starter), so the eval can record the case as a judge failure rather than crash.

```python
parse_verdict('{"reason": "States the 14-day window but promises a free label.", "score": 2}')
# Verdict(reason='States the 14-day window but promises a free label.', score=2)

parse_verdict('{"reason": "Mostly right.", "score": 4.5}')    # raises JudgeError
```
