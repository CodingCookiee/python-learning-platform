import re
import time
from urllib.parse import urljoin
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup


def parse_listings(html, base_url):
    """[{"id", "title", "url", "price"}] for each non-sponsored listing on a page (this part works)."""
    soup = BeautifulSoup(html, "html.parser")
    listings = []
    for card in soup.select("article.listing:not(.sponsored)"):
        link = card.select_one("h2 a")
        price = card.select_one(".price")
        digits = re.sub(r"\D", "", price.get_text()) if price else ""
        listings.append({
            "id": card.get("data-id"),
            "title": link.get_text(strip=True),
            "url": urljoin(base_url, link["href"]),
            "price": int(digits) if digits else None,
        })
    return listings


def next_page(html, page_url):
    link = BeautifulSoup(html, "html.parser").select_one("a[rel~=next]")
    return urljoin(page_url, link["href"]) if link and link.get("href") else None


def crawl_listings(start_url, fetch, *, robots_txt, user_agent="agency-bot", max_pages=5, sleep=time.sleep):
    """Every listing across the rel=next pages, fetched politely."""
    robots = RobotFileParser()
    robots.parse(robots_txt.splitlines())
    delay = robots.crawl_delay(user_agent)
    delay = 1.0 if delay is None else float(delay)

    listings, seen_ids, visited = [], set(), set()
    url = start_url
    while url and len(visited) < max_pages:
        if url in visited or not robots.can_fetch(user_agent, url):
            break
        if visited:
            sleep(delay)  # never hit the server back to back
        visited.add(url)
        html = fetch(url)
        for listing in parse_listings(html, url):
            if listing["id"] not in seen_ids:
                seen_ids.add(listing["id"])
                listings.append(listing)
        url = next_page(html, url)
    return listings
