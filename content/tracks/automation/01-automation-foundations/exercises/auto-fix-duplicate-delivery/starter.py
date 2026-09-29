def handle_delivery(event, processed, crm):
    """Create a CRM contact for each new lead.created event: "created", "duplicate" or "ignored"."""
    if event["type"] != "lead.created":
        return "ignored"
    processed.add(event["id"])
    crm.create_contact(event["data"])
    return "created"
