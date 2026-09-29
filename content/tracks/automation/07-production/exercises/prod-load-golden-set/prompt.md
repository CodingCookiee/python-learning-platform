The invoice extractor's golden dataset lives in `golden.jsonl`, and three people add cases to it.
Last week someone pasted a case with a missing quote, and the eval job crashed with a
`JSONDecodeError` that didn't say which of 400 lines was broken.

Write `load_cases(text)`, which takes the file's contents and returns the cases as a list of dicts,
in file order.

- Blank lines (including ones with only spaces) are skipped.
- A line that isn't valid JSON, isn't a JSON object, or has no `"id"` or no `"input"` raises
  `ValueError` whose message starts with `line N:`, where N is the line's number in the file
  (counting from 1, blank lines included).
- Two cases with the same `id` raise `ValueError` starting `line N:` for the second one, and naming
  the id.

```python
text = '{"id": "inv-001", "input": "Kiln Supplies INV-2291 ...", "expected": {"total": "1240.50"}}\n\n{"id": "inv-002", "input": "..."}\n'
[case["id"] for case in load_cases(text)]   # ["inv-001", "inv-002"]

load_cases('{"id": "inv-001", "input": "..."}\n{"id": "inv-002", "input": "...}\n')
# ValueError: line 2: ...
```
