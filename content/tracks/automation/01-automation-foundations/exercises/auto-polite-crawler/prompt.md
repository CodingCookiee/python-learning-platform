The agent's listings run over several pages, each ending with a link like
`<a rel="next" href="/listings/page/2">Next</a>`. Write the crawler that walks them politely:

```python
crawl_listings(start_url, fetch, *, robots_txt, user_agent="agency-bot", max_pages=5, sleep=time.sleep)
```

- `fetch(url)` returns a page's HTML (in real life a small httpx wrapper that sends your
  `User-Agent`; in the tests, a fake site).
- `robots_txt` is the text of the site's robots.txt. Never fetch a URL it disallows for
  `user_agent`: stop the crawl there.
- Wait between requests: call `sleep(delay)` before every fetch **except the first**, where `delay`
  is robots.txt's `Crawl-delay` for your agent, or `1.0` seconds if it doesn't set one.
- Follow each page's `rel="next"` link (resolving relative links), and stop when there isn't one,
  when it leads to a page you've already fetched, or after `max_pages` pages.
- Parse each page with `parse_listings(html, page_url)` (provided; it's the last drill's answer),
  and return every listing found, in order, without repeating a listing `id` seen on an earlier page.

```python
robots = "User-agent: *\nCrawl-delay: 2\nDisallow: /account/"
crawl_listings("https://agents.example/listings/page/1", fetch, robots_txt=robots, sleep=waits.append)
# 5 listings from 3 pages, and waits == [2.0, 2.0]
```
