The status page shows an error rate for each hour, and it has to update while the server is still
writing the log. Each log line is `timestamp path status`, like `"2026-09-28T09:15:02 /pay 502"`,
and the lines arrive in time order.

Write a generator function `hourly_error_rates(lines)` that yields one tuple per hour,
`(hour, requests, errors, rate)`, where:

- `hour` is a `datetime` for the start of the hour (minutes and seconds zero),
- `requests` is the number of lines in that hour, `errors` is how many had a status of 500 or
  more, and `rate` is `errors / requests` rounded to 3 decimal places.

Lines that don't have exactly three fields are skipped. Each hour is yielded as soon as the first
line of the next hour arrives, so the function never holds more than one hour of the log, and
works on a log that never ends.

```python
log = [
    "2026-09-28T09:15:02 /pay 502",
    "2026-09-28T09:40:10 /home 200",
    "2026-09-28T09:59:59 /cart 200",
    "2026-09-28T10:01:00 /pay 200",
]
list(hourly_error_rates(log))
# [(datetime(2026, 9, 28, 9, 0), 3, 1, 0.333), (datetime(2026, 9, 28, 10, 0), 1, 0, 0.0)]
```
