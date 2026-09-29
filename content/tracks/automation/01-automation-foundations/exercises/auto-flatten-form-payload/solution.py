SINGLE_CHOICE = {"DROPDOWN", "MULTIPLE_CHOICE"}


def answer(field):
    value = field.get("value")
    kind = field.get("type")
    if kind in SINGLE_CHOICE or kind == "CHECKBOXES":
        texts = {option["id"]: option["text"] for option in field.get("options", [])}
        chosen = [texts[option_id] for option_id in value or [] if option_id in texts]
        if kind == "CHECKBOXES":
            return chosen
        return chosen[0] if chosen else None
    if isinstance(value, str):
        value = value.strip()
        return value.lower() if kind == "INPUT_EMAIL" else value
    return value


def flatten_submission(payload, field_map):
    """One flat lead dict from a form tool's question-list payload."""
    lead = {
        "submission_id": payload["data"]["responseId"],
        "submitted_at": payload["createdAt"],
        **{key: None for key in field_map.values()},
    }
    for field in payload["data"]["fields"]:
        key = field_map.get(field.get("label"))
        if key is not None:
            lead[key] = answer(field)
    return lead
