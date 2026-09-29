import re

SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def sentence_chunks(text, max_chars=300, overlap=1):
    """Pack whole sentences into chunks of at most max_chars, carrying overlap sentences forward."""
    sentences = [s for s in SENTENCE_END.split(text.strip()) if s]

    def fits(parts):
        return len(" ".join(parts)) <= max_chars

    chunks, current = [], []
    for sentence in sentences:
        if current and not fits(current + [sentence]):
            chunks.append(" ".join(current))
            carry = current[-overlap:] if overlap else []
            while carry and not fits(carry + [sentence]):
                carry = carry[1:]
            current = carry + [sentence]
        else:
            current.append(sentence)
    if current:
        chunks.append(" ".join(current))
    return chunks
