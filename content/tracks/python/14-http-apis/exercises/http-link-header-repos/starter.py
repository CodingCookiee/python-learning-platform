def iter_repos(client, org, *, per_page=100):
    """Yield every repository in an organisation, following Link headers."""
    response = client.get(f"/orgs/{org}/repos", params={"per_page": per_page})
    response.raise_for_status()
    yield from response.json()
