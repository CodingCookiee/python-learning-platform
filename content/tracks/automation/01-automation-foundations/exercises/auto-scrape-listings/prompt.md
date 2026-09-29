A property investor wants the new listings from a local estate agent's site each morning. The
site has no API; its listings page looks like this:

```html
<main>
  <article class="listing" data-id="4411">
    <h2><a href="/property/4411">  2 bed flat, Canal Street </a></h2>
    <p class="price">£325,000</p>
    <ul class="features"><li>2 bedrooms</li><li>Balcony</li></ul>
  </article>
  <article class="listing sponsored" data-id="9001">
    <h2><a href="/ad/9001">Luxury penthouse</a></h2>
    <p class="price">£1,250,000</p>
  </article>
  <article class="listing" data-id="4413">
    <h2><a href="https://partner.example/p/4413">Studio, Mill Lane</a></h2>
    <p class="price">POA</p>
    <ul class="features"><li>Studio</li></ul>
  </article>
</main>
```

Write `parse_listings(html, base_url)` that returns one dict per listing, in page order:

```python
parse_listings(html, "https://agents.example/listings")
# [
#   {"id": "4411", "title": "2 bed flat, Canal Street", "url": "https://agents.example/property/4411", "price": 325000, "bedrooms": 2},
#   {"id": "4413", "title": "Studio, Mill Lane", "url": "https://partner.example/p/4413", "price": None, "bedrooms": 0},
# ]
```

- Skip sponsored cards (class `sponsored`).
- `title` has surrounding whitespace removed; `url` is absolute.
- `price` is a whole number of pounds, or `None` when there's no number ("POA" means price on
  application) or no price at all.
- `bedrooms` comes from a feature like `2 bedrooms` or `1 bed`; a `Studio` has `0`; otherwise `None`.
