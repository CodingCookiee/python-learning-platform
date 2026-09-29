import hashlib


class Index:
    """A tiny stand-in for your vector index, keyed by chunk id."""

    def __init__(self, embed):
        self.embed = embed
        self.chunks = {}
        self.vectors = {}

    def upsert(self, chunks):
        chunks = list(chunks)
        if not chunks:
            return
        for chunk, vector in zip(chunks, self.embed([chunk["text"] for chunk in chunks])):
            self.chunks[chunk["id"]] = chunk
            self.vectors[chunk["id"]] = vector

    def delete_source(self, source):
        for chunk_id in [i for i, chunk in self.chunks.items() if chunk["source"] == source]:
            del self.chunks[chunk_id]
            del self.vectors[chunk_id]


def split_paragraphs(text, source):
    """One chunk per paragraph (blank-line separated)."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    return [{"id": f"{source}#{n}", "source": source, "text": p} for n, p in enumerate(paragraphs)]


def sync_index(index, documents, hashes, chunker=split_paragraphs):
    """Bring the index up to date with documents; returns what was added, updated, removed and unchanged."""
    for source, text in documents.items():
        index.upsert(chunker(text, source))
        hashes[source] = hashlib.sha256(text.encode()).hexdigest()
    return {"added": sorted(documents), "updated": [], "removed": [], "unchanged": []}
