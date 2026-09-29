The customer dashboard makes three independent requests to the account API, one after another.
Each takes about 100 ms, so the page takes 300 ms to load:

```python
async def load_dashboard(api, user_id):
    profile = await api.profile(user_id)
    orders = await api.orders(user_id)
    alerts = await api.alerts(user_id)
    ...
```

Refactor it so all three requests are in flight at the same time, and the dashboard loads in the
time of the slowest one. It must return exactly what it returns now:

```python
await load_dashboard(api, "u-17")
# {"name": "Ada Lovelace", "open_orders": 2, "unread_alerts": 1}
```

If a request fails, `load_dashboard` should still raise its error.
