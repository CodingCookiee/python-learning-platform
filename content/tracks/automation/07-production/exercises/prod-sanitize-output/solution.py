import re
from urllib.parse import urlsplit

PATTERN = re.compile(
    r"(?P<image>!\[(?P<alt>[^\]]*)\]\((?P<image_url>[^)\s]+)[^)]*\))"
    r"|(?P<link>\[(?P<label>[^\]]*)\]\((?P<link_url>[^)\s]+)[^)]*\))"
    r"|(?P<html><img\b[^>]*>)"
    r"|(?P<bare>https?://[^\s<>()\[\]]+)",
    re.IGNORECASE,
)
TRAILING = ".,;:!?'\""


def is_allowed(url: str, allowed_domains) -> bool:
    """True when the URL's host is an allowed domain or a subdomain of one."""
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    if parts.scheme not in ("http", "https"):
        return False
    host = (parts.hostname or "").lower()
    return any(host == domain or host.endswith("." + domain) for domain in allowed_domains)


def sanitize(text: str, allowed_domains) -> str:
    """Remove images and links that could send data anywhere but the allowed domains."""

    def replace(match: re.Match) -> str:
        if match["image"]:
            return match["image"] if is_allowed(match["image_url"], allowed_domains) else "[image removed]"
        if match["link"]:
            return match["link"] if is_allowed(match["link_url"], allowed_domains) else f"{match['label']} (link removed)"
        if match["html"]:
            return "[image removed]"
        url = match["bare"]
        stripped = url.rstrip(TRAILING)
        tail = url[len(stripped):]
        return (stripped if is_allowed(stripped, allowed_domains) else "[link removed]") + tail

    return PATTERN.sub(replace, text)
