import re

CITATION = re.compile(r"\[(\d+(?:\s*,\s*\d+)*)\]")


def parse_citations(answer):
    """The source numbers cited in an answer, each once, in order of first appearance."""
    numbers = [int(part) for group in CITATION.findall(answer) for part in group.split(",")]
    return [n for n in dict.fromkeys(numbers) if n > 0]
