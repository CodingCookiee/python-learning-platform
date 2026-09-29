import re

VAGUE_STEMS = ("improv", "optimi", "enhanc", "streamlin", "better", "seamless")
OPEN_ENDED = ("etc", "and more", "as needed", "ongoing")


def problems(text):
    found = []
    for word in re.findall(r"[a-z]+", text.lower()):
        if word.startswith(VAGUE_STEMS) and f"vague word: {word}" not in found:
            found.append(f"vague word: {word}")
    for phrase in OPEN_ENDED:
        if re.search(rf"\b{re.escape(phrase)}\b", text, re.IGNORECASE):
            found.append(f"open-ended: {phrase}")
    if not any(ch.isdigit() for ch in text):
        found.append("no number")
    return found


def lint_deliverables(deliverables):
    """(index, problem) for every vague word, open-ended phrase and missing number."""
    return [(index, problem) for index, text in enumerate(deliverables) for problem in problems(text)]
