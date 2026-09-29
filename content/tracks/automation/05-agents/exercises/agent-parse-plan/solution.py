import re

STEP = re.compile(r"^\s*\d+[.)]\s+(.+)$", re.MULTILINE)


def parse_plan(text: str) -> list[str]:
    """The numbered steps in a planner's reply."""
    return [match.group(1).strip() for match in STEP.finditer(text)]
