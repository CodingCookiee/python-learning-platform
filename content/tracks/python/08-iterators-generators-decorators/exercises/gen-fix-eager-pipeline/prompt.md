The fraud team's alert shows the first few declined card payments from the live payment feed.
Each line of the feed is `timestamp,order_id,amount_pence,status`. The code works in the tests
someone wrote with a five-line list, but on the real feed, which never ends, the alert never
appears:

```python
feed = ["2026-09-28T09:00:01,A1,1250,approved", "2026-09-28T09:00:04,A2,899,declined"]
first_declines(feed, 1)   # ["A2"], but it hangs on the live feed
```

Fix the pipeline so `first_declines(lines, n)` stops reading the feed as soon as it has found `n`
declined payments. Keep the three functions and what they produce: `parse_payments` still yields
one dict per line, `declined` still yields only the declined ones, and `first_declines` still
returns a list of order ids.
