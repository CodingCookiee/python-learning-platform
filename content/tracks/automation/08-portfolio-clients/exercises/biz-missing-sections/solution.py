REQUIRED = ["Goal", "Deliverables", "Acceptance criteria", "Out of scope", "Milestones", "Assumptions and risks"]


def missing_sections(markdown):
    """The REQUIRED sections with no "## " heading in the document, in REQUIRED order."""
    headings = {line[3:].strip().lower() for line in markdown.splitlines() if line.startswith("## ")}
    return [name for name in REQUIRED if name.lower() not in headings]
