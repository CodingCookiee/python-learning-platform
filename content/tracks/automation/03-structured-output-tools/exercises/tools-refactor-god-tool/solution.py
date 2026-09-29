STAGES = ("lead", "qualified", "proposal", "won", "lost")

CONTACTS = {"ada@northwind.example": {"contact_id": "C-301", "name": "Ada Park"}}
NOTES = []
DEALS = {"D-77": "proposal"}


def find_contact(email):
    contact = CONTACTS.get(email.strip().lower())
    return contact if contact else {"error": f"No contact with email {email}"}


def add_note(contact_id, text):
    NOTES.append((contact_id, text))
    return {"contact_id": contact_id, "notes": sum(1 for c, _ in NOTES if c == contact_id)}


def set_deal_stage(deal_id, stage):
    if deal_id not in DEALS:
        return {"error": f"No deal {deal_id}"}
    if stage not in STAGES:
        return {"error": f"Unknown stage {stage}"}
    DEALS[deal_id] = stage
    return {"deal_id": deal_id, "stage": stage}


def _tool(name, description, properties):
    return {
        "name": name,
        "description": description,
        "parameters": {"type": "object", "properties": properties, "required": list(properties)},
    }


TOOLS = [
    _tool(
        "find_contact",
        "Find a CRM contact by email address. Returns contact_id and name, or an error if there's no match.",
        {"email": {"type": "string", "description": "The contact's email address, e.g. ada@northwind.example"}},
    ),
    _tool(
        "add_note",
        "Add a note to a contact's record. Use a contact_id from find_contact. Returns how many notes it has.",
        {
            "contact_id": {"type": "string", "description": "A contact_id from find_contact, e.g. C-301"},
            "text": {"type": "string", "description": "The note, in plain sentences"},
        },
    ),
    _tool(
        "set_deal_stage",
        "Move a deal to a new pipeline stage. Returns the deal_id and its new stage.",
        {
            "deal_id": {"type": "string", "description": "The deal's id, e.g. D-77"},
            "stage": {"type": "string", "enum": list(STAGES), "description": "The new stage"},
        },
    ),
]

REGISTRY = {"find_contact": find_contact, "add_note": add_note, "set_deal_stage": set_deal_stage}
