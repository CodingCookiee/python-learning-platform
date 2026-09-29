def handle_delivery(event, processed, crm):
    """Create a CRM contact for each new lead.created event: "created", "duplicate" or "ignored"."""
    if event["id"] in processed:
        return "duplicate"
    if event["type"] != "lead.created":
        return "ignored"
    crm.create_contact(event["data"])
    processed.add(event["id"])  # only once the work has succeeded
    return "created"
