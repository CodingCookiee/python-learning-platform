def iter_repos(client, org, *, per_page=100):
    """Yield every repository in an organisation, following Link headers."""
    response = client.get(f"/orgs/{org}/repos", params={"per_page": per_page})
    while True:
        response.raise_for_status()
        yield from response.json()
        next_link = response.links.get("next")
        if next_link is None:
            return
        response = client.get(next_link["url"])
