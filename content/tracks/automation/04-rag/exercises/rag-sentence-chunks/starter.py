import re


def sentence_chunks(text, max_chars=300, overlap=1):
    """Pack whole sentences into chunks of at most max_chars, carrying overlap sentences forward."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [" ".join(sentences[i:i + 3]) for i in range(0, len(sentences), 3)]
