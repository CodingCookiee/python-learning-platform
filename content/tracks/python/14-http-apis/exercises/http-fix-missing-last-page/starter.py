def iter_contacts(client, page_size=50):
    """Every contact in the CRM, one at a time."""
    params = {"limit": page_size}
    while True:
        page = client.get("/v1/contacts", params=params).raise_for_status().json()
        if not page["has_more"]:
            break
        yield from page["data"]
        params["cursor"] = page["next_cursor"]
