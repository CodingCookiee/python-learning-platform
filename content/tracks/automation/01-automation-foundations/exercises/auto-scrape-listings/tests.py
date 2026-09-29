from plp import hidden, test
from solution import parse_listings

BASE = "https://agents.example/listings"
PAGE = """
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
"""


@test("Parses the agent's listings page")
def _():
    assert parse_listings(PAGE, BASE) == [
        {"id": "4411", "title": "2 bed flat, Canal Street", "url": "https://agents.example/property/4411", "price": 325000, "bedrooms": 2},
        {"id": "4413", "title": "Studio, Mill Lane", "url": "https://partner.example/p/4413", "price": None, "bedrooms": 0},
    ]


@test("Skips sponsored cards")
def _():
    assert "9001" not in [listing["id"] for listing in parse_listings(PAGE, BASE)]


@test("A page with no listings gives an empty list")
def _():
    assert parse_listings("<main><p>No properties match your search.</p></main>", BASE) == []


@hidden("Relative links without a leading slash resolve against the page URL")
def _():
    html = '<article class="listing" data-id="7"><h2><a href="property/7">Cottage</a></h2></article>'
    assert parse_listings(html, "https://agents.example/area/leeds/")[0]["url"] == "https://agents.example/area/leeds/property/7"


@hidden("Missing price and features give None, and '1 bed' counts")
def _():
    html = """
    <article class="listing" data-id="8"><h2><a href="/p/8">Flat</a></h2></article>
    <article class="listing" data-id="9"><h2><a href="/p/9">House</a></h2>
      <p class="price">Offers over £210,500</p><ul class="features"><li>Garden</li><li>1 bed</li></ul>
    </article>
    """
    listings = parse_listings(html, BASE)
    assert [(l["price"], l["bedrooms"]) for l in listings] == [(None, None), (210500, 1)]
