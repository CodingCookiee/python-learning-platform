Write `next_page_url(response)` that returns the URL of the next page from a response's `Link`
header, as an absolute URL string, or `None` when there's no next page.

```python
# Link: <https://api.github.com/orgs/acme/repos?page=2>; rel="next", <https://api.github.com/orgs/acme/repos?page=5>; rel="last"
next_page_url(response)   # "https://api.github.com/orgs/acme/repos?page=2"
```

Some APIs send a relative URL (`</orgs/acme/repos?page=2>`). It's relative to the URL of the
response, so make it absolute. A response with no `Link` header, or with only `prev`, `first` and
`last` links, has no next page.
