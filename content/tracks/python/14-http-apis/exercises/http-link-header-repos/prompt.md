GitHub pages an organisation's repositories with `Link` headers. The body of each page is a JSON
list of repositories, and the `Link` header says where the next page is:

```text
GET https://api.github.com/orgs/acme/repos?per_page=100
Link: <https://api.github.com/organizations/4412/repos?per_page=100&page=2>; rel="next", <...&page=3>; rel="last"
```

Write a generator `iter_repos(client, org, *, per_page=100)` that yields every repository dict.
The `client` has `base_url="https://api.github.com"`.

- The first request is `GET /orgs/<org>/repos?per_page=<per_page>`.
- Each next page is fetched from the `next` link **exactly as given**. (GitHub's next URL isn't
  even on the same path as the first one, so rebuilding it yourself would break.)
- Stop when a page has no `next` link. Raise `httpx.HTTPStatusError` for a failed page.
- Be lazy: fetch a page only when the caller needs an item from it.

```python
[repo["name"] for repo in iter_repos(client, "acme", per_page=3)]
# ["billing", "crm-sync", "docs", "infra", "mobile", "web", "website-old"]   (three requests)
```
