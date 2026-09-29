The lead-enrichment step calls `parse_reply(response.text)` on every model reply. It worked in
testing, then crashed in production with `JSONDecodeError: Expecting value: line 1 column 1
(char 0)`. The culprit was a reply like this:

````text
```json
{"company": "Northwind", "seats": 40}
```
````

Fix `parse_reply(text)` so it returns the parsed object whether or not the reply is wrapped in a
markdown code fence:

- a fence tagged `json` (in any case, so `JSON` too) or not tagged at all,
- blank lines or spaces around the reply or inside the fence.

Text that isn't JSON at all should still raise `json.JSONDecodeError`, as it does now.

```python
parse_reply('{"company": "Northwind", "seats": 40}')                  # {"company": "Northwind", "seats": 40}
parse_reply(FENCE + 'json\n{"company": "Northwind", "seats": 40}\n' + FENCE)   # the same
```

(`FENCE` is three backticks.)
