The CRM's user API answers `429` if a client has more than five requests in flight. Write a
coroutine that fetches many user profiles concurrently, but never more than `limit` at a time:

```python
fetch_profiles(client, user_ids, *, limit=5)
```

- It sends `GET /v1/users/<id>` for each ID and returns the profiles (the JSON dicts) in the order
  of `user_ids`.
- At most `limit` requests are ever in flight together, and it uses all `limit` slots when there's
  enough work, so a batch isn't slower than it needs to be.
- A failed request raises `httpx.HTTPStatusError`.

```python
profiles = await fetch_profiles(client, [f"u_{n}" for n in range(1, 13)], limit=5)
[profile["id"] for profile in profiles]   # ["u_1", "u_2", ..., "u_12"], never more than 5 in flight
```
