import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup


def parse_price(card):
    tag = card.select_one(".price")
    digits = re.sub(r"\D", "", tag.get_text()) if tag else ""
    return int(digits) if digits else None


def parse_bedrooms(card):
    for item in card.select(".features li"):
        text = item.get_text(strip=True).lower()
        if text == "studio":
            return 0
        if match := re.search(r"(\d+) bed", text):
            return int(match.group(1))
    return None


def parse_listings(html, base_url):
    """[{"id", "title", "url", "price", "bedrooms"}] for each non-sponsored listing, in page order."""
    soup = BeautifulSoup(html, "html.parser")
    listings = []
    for card in soup.select("article.listing:not(.sponsored)"):
        link = card.select_one("h2 a")
        listings.append({
            "id": card.get("data-id"),
            "title": link.get_text(strip=True),
            "url": urljoin(base_url, link["href"]),
            "price": parse_price(card),
            "bedrooms": parse_bedrooms(card),
        })
    return listings
