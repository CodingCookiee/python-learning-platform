Write a coroutine `get_rate(client, base, quote)` that asks the FX API for an exchange rate, using
an `httpx.AsyncClient`:

```text
GET /v1/rates?base=GBP&quote=EUR   →   {"base": "GBP", "quote": "EUR", "rate": "1.1702"}
```

The API sends the rate as a string, so that no digits are lost. Return it as a `Decimal`, and raise
`httpx.HTTPStatusError` if the API answers with an error status.

```python
await get_rate(client, "GBP", "EUR")   # Decimal("1.1702")
```
