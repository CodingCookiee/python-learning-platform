def route(label: str, confidence: float, threshold: float = 0.75) -> str:
    """The queue for a classified ticket: its label, or "human_review"."""
    if label == "unknown" or confidence < threshold:
        return "human_review"
    return label
