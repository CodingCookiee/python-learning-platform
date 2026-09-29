import bs4  # noqa: F401  (imported here, untimed, so loading your file is quick)
from plp import hidden, load_module, test


def crawl_listings(*args, **kwargs):
    return load_module("crawler").crawl_listings(*args, **kwargs)


SITE = "https://agents.example"
ROBOTS = "User-agent: *\nCrawl-delay: 2\nDisallow: /account/"


def card(id, price="£200,000"):
    return (
        f'<article class="listing" data-id="{id}"><h2><a href="/property/{id}">Flat {id}</a></h2>'
        f'<p class="price">{price}</p></article>'
    )


def page(ids, next_href=None):
    nav = f'<a rel="next" href="{next_href}">Next</a>' if next_href else ""
    return f"<main>{''.join(card(i) for i in ids)}</main><nav>{nav}</nav>"


PAGES = {
    f"{SITE}/listings/page/1": page(["101", "102"], "/listings/page/2"),
    f"{SITE}/listings/page/2": page(["103", "104"], "3"),
    f"{SITE}/listings/page/3": page(["105"]),
}


class FakeSite:
    def __init__(self, pages):
        self.pages = pages
        self.fetched = []

    def __call__(self, url):
        self.fetched.append(url)
        return self.pages[url]


def ids(listings):
    return [listing["id"] for listing in listings]


@test("Crawls three pages, pausing for the crawl delay between them")
def _():
    site, waits = FakeSite(PAGES), []
    listings = crawl_listings(f"{SITE}/listings/page/1", site, robots_txt=ROBOTS, sleep=waits.append)
    assert ids(listings) == ["101", "102", "103", "104", "105"]
    assert waits == [2.0, 2.0]


@test("Resolves the next links and fetches each page once")
def _():
    site = FakeSite(PAGES)
    crawl_listings(f"{SITE}/listings/page/1", site, robots_txt=ROBOTS, sleep=lambda s: None)
    assert site.fetched == [f"{SITE}/listings/page/1", f"{SITE}/listings/page/2", f"{SITE}/listings/page/3"]


@test("Never fetches a page robots.txt disallows")
def _():
    site = FakeSite(PAGES)
    robots = "User-agent: *\nDisallow: /listings/page/3"
    listings = crawl_listings(f"{SITE}/listings/page/1", site, robots_txt=robots, sleep=lambda s: None)
    assert f"{SITE}/listings/page/3" not in site.fetched
    assert ids(listings) == ["101", "102", "103", "104"]


@test("Waits one second when robots.txt sets no crawl delay")
def _():
    waits = []
    crawl_listings(f"{SITE}/listings/page/1", FakeSite(PAGES), robots_txt="User-agent: *\nAllow: /", sleep=waits.append)
    assert waits == [1.0, 1.0]


@hidden("Stops after max_pages")
def _():
    site = FakeSite(PAGES)
    listings = crawl_listings(f"{SITE}/listings/page/1", site, robots_txt=ROBOTS, max_pages=2, sleep=lambda s: None)
    assert ids(listings) == ["101", "102", "103", "104"]
    assert len(site.fetched) == 2


@hidden("A next link back to an earlier page doesn't loop, and repeated listings are dropped")
def _():
    pages = {
        f"{SITE}/a": page(["1", "2"], "/b"),
        f"{SITE}/b": page(["2", "3"], "/a"),
    }
    site = FakeSite(pages)
    listings = crawl_listings(f"{SITE}/a", site, robots_txt=ROBOTS, sleep=lambda s: None)
    assert ids(listings) == ["1", "2", "3"]
    assert site.fetched == [f"{SITE}/a", f"{SITE}/b"]


@hidden("A disallowed start page fetches nothing, and rules for your own agent apply")
def _():
    site = FakeSite(PAGES)
    robots = "User-agent: agency-bot\nDisallow: /listings/\n\nUser-agent: *\nAllow: /"
    assert crawl_listings(f"{SITE}/listings/page/1", site, robots_txt=robots, sleep=lambda s: None) == []
    assert site.fetched == []
