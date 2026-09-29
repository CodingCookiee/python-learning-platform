def render_deliverables(deliverables):
    """The Deliverables section: each deliverable, numbered, followed by its acceptance criteria."""
    lines = ["## Deliverables", ""]
    for number, item in enumerate(deliverables, 1):
        lines.append(f"{number}. {item['title']}")
    lines.append("   Accepted when:")
    for criterion in item["acceptance"]:
        lines.append(f"   - {criterion}")
    return "\n".join(lines)
