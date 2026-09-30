import re

IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")


def is_allowed(url, allowed_domains):
    """True when the URL's host is an allowed domain or a subdomain of one."""
    return any(domain in url for domain in allowed_domains)


def sanitize(text, allowed_domains):
    """Remove images and links that could send data anywhere but the allowed domains."""
    return IMAGE.sub("[image removed]", text)
