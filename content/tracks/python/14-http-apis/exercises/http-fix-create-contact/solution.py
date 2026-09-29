def create_contact(client, name, email, tags=()):
    """Create a contact in the CRM and return it as a dict."""
    response = client.post("/v1/contacts", json={"name": name, "email": email, "tags": list(tags)})
    if response.status_code != 201:
        raise ValueError(f"the CRM refused the contact: {response.json()['error']}")
    return response.json()
