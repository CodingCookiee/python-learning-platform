Each web server writes its own log. Write a generator function `all_lines(*sources)` that yields
every line of the first source, then every line of the second, and so on, as one stream. Use
`yield from`, and read each source lazily: nothing is read until a line is asked for, and only as
far as needed.

```python
web1 = ["GET /", "POST /pay"]
web2 = ["GET /cart"]
list(all_lines(web1, web2))   # ["GET /", "POST /pay", "GET /cart"]
```
