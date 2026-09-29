The price scraper fetches hundreds of product pages concurrently, and `fetch_with_retry` retries
a page after a short pause when the shop's server can't answer. It returns the right pages, but in
production the whole scraper stalls every time one page is retried: while one request waits to
try again, no other request makes any progress.

```python
await fetch_with_retry(client, "https://shop.example.com/p/ETH-1KG")
# "<html>...ETH-1KG...</html>", after two retries of 0.05 s and 0.1 s
```

Fix it so that waiting to retry doesn't block the event loop. Keep everything else: up to
`attempts` tries, a pause of `backoff * attempt` seconds after each failed attempt, and the last
`ConnectionError` raised if every attempt fails.
