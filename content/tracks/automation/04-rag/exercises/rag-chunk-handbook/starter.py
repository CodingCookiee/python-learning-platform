from dataclasses import dataclass


@dataclass(frozen=True)
class Chunk:
    id: str
    source: str
    title: str
    position: int
    text: str

    def for_embedding(self):
        """The title, a blank line, then the text; or only the text when there's no title."""
        ...


def chunk_document(markdown, source, max_chars=400):
    """Split a markdown document into Chunks titled with their heading path."""
    ...
