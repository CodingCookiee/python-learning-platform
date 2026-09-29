import re

VAGUE_STEMS = ("improv", "optimi", "enhanc", "streamlin", "better", "seamless")
OPEN_ENDED = ("etc", "and more", "as needed", "ongoing")


def lint_deliverables(deliverables):
    """(index, problem) for every vague word, open-ended phrase and missing number."""
    ...
