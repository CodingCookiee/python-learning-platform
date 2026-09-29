`total_bytes(lines)` adds up the response sizes in an access log, where each line ends with the
number of bytes sent, or `-` when nothing was sent. It's correct, but it builds a list of every
size before adding them up, and on a full day's log that list holds millions of numbers.

Rewrite it as a single `sum()` over a **generator expression**, with no list and no `append`.

```python
log = [
    '203.0.113.9 "GET /home" 200 5120',
    '203.0.113.9 "GET /logo.png" 304 -',
    '198.51.100.4 "POST /pay" 201 734',
]
total_bytes(log)   # 5854
```
