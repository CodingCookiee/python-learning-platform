def render_deliverables(deliverables):
    """The Deliverables section: each deliverable, numbered, followed by its acceptance criteria."""
    lines = ["## Deliverables", ""]
    for number, item in enumerate(deliverables, 1):
        if not item["acceptance"]:
            raise ValueError(f"'{item['title']}' has no acceptance criteria")
        lines.append(f"{number}. {item['title']}")
        lines.append("   Accepted when:")
        for criterion in item["acceptance"]:
            lines.append(f"   - {criterion}")
    return "\n".join(lines)
