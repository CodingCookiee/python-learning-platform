A mailing-list API accepts at most `size` contacts per request. Write
`upload_requests(rows, size)` that returns the request bodies to send: a list of dicts, each with a
`batch` number counting from 1 and a `rows` list.

```python
upload_requests(["ada@example.com", "grace@example.com", "linus@example.com"], 2)
# [
#     {"batch": 1, "rows": ["ada@example.com", "grace@example.com"]},
#     {"batch": 2, "rows": ["linus@example.com"]},
# ]
```

`rows` must be a list (the API's JSON encoder expects one), and the input may be a one-pass
iterator rather than a list.
