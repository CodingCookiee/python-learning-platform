import re


def resolve_citations(answer, chunks):
    """The chunks an answer cites, each once, in the order they're first cited."""
    numbers = [int(n) for n in re.findall(r"\[(\d+)\]", answer)]
    cited, seen = [], set()
    for n in numbers:
        if 1 <= n <= len(chunks) and n not in seen:
            seen.add(n)
            cited.append(chunks[n - 1])
    return cited
