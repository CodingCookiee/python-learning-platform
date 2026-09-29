def create_contact(client, name, email, tags=()):
    """Create a contact in the CRM and return it as a dict."""
    response = client.get("/v1/contacts", params={"name": name, "email": email, "tags": tags})
    return response.json()
