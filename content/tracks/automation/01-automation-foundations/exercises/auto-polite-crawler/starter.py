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


def crawl_listings(start_url, fetch, *, robots_txt, user_agent="agency-bot", max_pages=5, sleep=time.sleep):
    """Every listing across the rel=next pages, fetched politely."""
    ...
