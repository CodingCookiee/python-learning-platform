# Async Web Scraper - Starter Template

"""Starter scaffold for the Module 8 async web scraper project."""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

import aiohttp
from bs4 import BeautifulSoup


@dataclass
class ScrapedPage:
    """Represents one scraped page result."""

    url: str
    title: str
    headings: list[str]
    links: list[str]


class AsyncWebScraper:
    """Fetch multiple pages concurrently and extract structured data."""

    def __init__(self, urls: list[str], output_path: str = "scraped_results.json"):
        self.urls = urls
        self.output_path = Path(output_path)

    async def fetch(self, session: aiohttp.ClientSession, url: str) -> str:
        """Fetch HTML for a single URL."""
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=20)) as response:
            response.raise_for_status()
            return await response.text()

    def parse_html(self, url: str, html: str) -> ScrapedPage:
        """Extract a title, headings, and links from HTML."""
        soup = BeautifulSoup(html, "html.parser")
        title = soup.title.text.strip() if soup.title and soup.title.text else ""
        headings = [h.get_text(" ", strip=True) for h in soup.find_all(["h1", "h2", "h3"])]
        links = [
            a.get("href", "").strip()
            for a in soup.find_all("a")
            if a.get("href") and a.get("href", "").strip()
        ]
        return ScrapedPage(url=url, title=title, headings=headings, links=links)

    async def scrape_one(self, session: aiohttp.ClientSession, url: str) -> ScrapedPage:
        """Fetch and parse one URL."""
        html = await self.fetch(session, url)
        return self.parse_html(url, html)

    async def scrape_all(self) -> list[ScrapedPage]:
        """Scrape all URLs concurrently."""
        async with aiohttp.ClientSession(headers={"User-Agent": "AsyncWebScraper/1.0"}) as session:
            tasks = [self.scrape_one(session, url) for url in self.urls]
            return await asyncio.gather(*tasks)

    def save_results(self, results: list[ScrapedPage]) -> None:
        """Write scraped results to JSON."""
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        payload = [asdict(result) for result in results]
        self.output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    async def run(self) -> list[ScrapedPage]:
        """Run the scraper end to end."""
        results = await self.scrape_all()
        self.save_results(results)
        return results


def load_urls_from_file(path: str) -> list[str]:
    """Load URLs from a text file, one per line."""
    raw = Path(path).read_text(encoding="utf-8")
    return [line.strip() for line in raw.splitlines() if line.strip()]


def main() -> None:
    """Run the async web scraper starter."""
    print("=== Async Web Scraper ===")
    print("TODO: Add robots.txt checks, rate limiting, retries, and richer extraction.")

    urls_file = input("Enter a text file containing URLs: ").strip()
    output_path = input("Enter output JSON path: ").strip() or "scraped_results.json"

    urls = load_urls_from_file(urls_file)
    if not urls:
        raise SystemExit("No URLs provided.")

    scraper = AsyncWebScraper(urls=urls, output_path=output_path)
    results = asyncio.run(scraper.run())
    print(f"Scraped {len(results)} pages. Results saved to {output_path}")


if __name__ == "__main__":
    main()
