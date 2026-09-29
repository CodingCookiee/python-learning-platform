import re


def parse_citations(answer):
    """The source numbers cited in an answer, each once, in order of first appearance."""
    return re.findall(r"\[(\d)\]", answer)
