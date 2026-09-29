def iter_contacts(client, page_size=50):
    """Every contact in the CRM, one at a time."""
    params = {"limit": page_size}
    while True:
        page = client.get("/v1/contacts", params=params).raise_for_status().json()
        yield from page["data"]
        if not page["has_more"]:
            break
        params["cursor"] = page["next_cursor"]
