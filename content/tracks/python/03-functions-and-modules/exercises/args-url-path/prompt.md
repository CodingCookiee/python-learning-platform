Write `url_path(*segments)` that joins any number of segments into an API path. The path starts
with `/`, the segments are separated by single slashes, and slashes a caller included at either end
of a segment are dropped. Segments can be numbers.

```python
url_path("api", "v1", "orders", 1042)    # "/api/v1/orders/1042"
url_path("/api/", "users/")              # "/api/users"
url_path()                               # "/"
```
