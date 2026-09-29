import re


def resolve_citations(answer, chunks):
    """The chunks an answer cites, each once, in the order they're first cited."""
    numbers = [int(n) for n in re.findall(r"\[(\d+)\]", answer)]
    return [chunks[n] for n in numbers]
