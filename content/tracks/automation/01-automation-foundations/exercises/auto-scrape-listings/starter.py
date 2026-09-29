import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup


def parse_listings(html, base_url):
    """[{"id", "title", "url", "price", "bedrooms"}] for each non-sponsored listing, in page order."""
    ...
