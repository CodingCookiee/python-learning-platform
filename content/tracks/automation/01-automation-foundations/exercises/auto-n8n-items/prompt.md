Your Python service returns plain rows, but an n8n Code node must return **items**: each row
wrapped in a dict under the key `"json"`. Write `to_items(rows)`:

```python
to_items([{"email": "amira@example.com"}, {"email": "tom@example.com"}])
# [{"json": {"email": "amira@example.com"}}, {"json": {"email": "tom@example.com"}}]
```

Each item gets its own copy of the row, so changing an item later never changes the caller's row.
