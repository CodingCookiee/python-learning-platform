def next_page_url(response):
    """The absolute URL of the next page, from the Link header, or None."""
    link = response.links.get("next")
    if link is None:
        return None
    return str(response.url.join(link["url"]))
