Write `build_url(base, **params)` that adds any keyword arguments to a URL as a query string, in
the order they were passed. Parameters whose value is `None` are left out, and a URL with no
parameters left has no `?`.

```python
build_url("https://shop.example/search", q="mug", page=2)
# "https://shop.example/search?q=mug&page=2"

build_url("https://shop.example/search", q="mug", colour=None)
# "https://shop.example/search?q=mug"

build_url("https://shop.example/search")
# "https://shop.example/search"
```

The values in the tests are plain words and numbers, so you don't need to escape anything.
