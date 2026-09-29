The finance team's month-end script is ordinary synchronous Python, but the banking client is
async: `await client.balance(account)` returns one account's balance. Write two functions:

- `fetch_balances(client, accounts)`, a coroutine that fetches every balance **at the same time**
  and returns `{"balances": {account: balance, ...}, "total": ...}`, with the balances in the
  order given and the total rounded to 2 decimals.
- `get_balances(client, accounts)`, an ordinary function (not `async def`) that runs
  `fetch_balances` and returns its result, so sync code can call it without knowing about asyncio.

```python
get_balances(client, ["GB-OPS-01", "GB-PAY-02", "EU-OPS-03"])
# {"balances": {"GB-OPS-01": 12500.0, "GB-PAY-02": 830.25, "EU-OPS-03": 4100.1}, "total": 17430.35}
```
