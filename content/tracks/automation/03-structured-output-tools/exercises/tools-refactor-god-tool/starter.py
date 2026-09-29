import json

STAGES = ("lead", "qualified", "proposal", "won", "lost")

CONTACTS = {"ada@northwind.example": {"contact_id": "C-301", "name": "Ada Park"}}
NOTES = []
DEALS = {"D-77": "proposal"}


def crm(action, payload):
    """Do something in the CRM."""
    data = json.loads(payload)
    if action == "find_contact":
        contact = CONTACTS.get(data["email"].strip().lower())
        return contact if contact else {"error": f"No contact with email {data['email']}"}
    elif action == "add_note":
        NOTES.append((data["contact_id"], data["text"]))
        return {"contact_id": data["contact_id"], "notes": sum(1 for c, _ in NOTES if c == data["contact_id"])}
    elif action == "set_stage":
        if data["deal_id"] not in DEALS:
            return {"error": f"No deal {data['deal_id']}"}
        if data["stage"] not in STAGES:
            return {"error": f"Unknown stage {data['stage']}"}
        DEALS[data["deal_id"]] = data["stage"]
        return {"deal_id": data["deal_id"], "stage": data["stage"]}
    return {"error": f"Unknown action {action}"}


TOOLS = [
    {
        "name": "crm",
        "description": "CRM operations.",
        "parameters": {
            "type": "object",
            "properties": {
                "action": {"type": "string", "description": "find_contact, add_note or set_stage"},
                "payload": {"type": "string", "description": "JSON arguments for the action"},
            },
            "required": ["action", "payload"],
        },
    }
]

REGISTRY = {"crm": crm}
