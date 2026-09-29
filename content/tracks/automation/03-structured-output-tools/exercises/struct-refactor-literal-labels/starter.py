VALID_LABELS = ["hot", "warm", "cold"]


def parse_label(data):
    """Check the lead scorer's reply and return the label and confidence."""
    label = data.get("label")
    if label is None:
        raise ValueError("label is missing")
    if not isinstance(label, str):
        raise ValueError("label must be a string")
    label = label.strip().lower()
    if label not in VALID_LABELS:
        raise ValueError(f"label must be one of {VALID_LABELS}")
    confidence = data.get("confidence")
    if confidence is None:
        raise ValueError("confidence is missing")
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        raise ValueError("confidence must be a number")
    if confidence < 0 or confidence > 1:
        raise ValueError("confidence must be between 0 and 1")
    return {"label": label, "confidence": confidence}
