import re
from dataclasses import dataclass

HEADING = re.compile(r"(#{1,6})\s+(.*)")
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


@dataclass(frozen=True)
class Chunk:
    id: str
    source: str
    title: str
    position: int
    text: str

    def for_embedding(self):
        """The title, a blank line, then the text; or only the text when there's no title."""
        return f"{self.title}\n\n{self.text}" if self.title else self.text


def _pack(text, max_chars):
    if len(text) <= max_chars:
        return [text]
    pieces, current = [], []
    for sentence in (s for s in SENTENCE_END.split(text) if s):
        if current and len(" ".join(current + [sentence])) > max_chars:
            pieces.append(" ".join(current))
            current = []
        current.append(sentence)
    if current:
        pieces.append(" ".join(current))
    return pieces


def _sections(markdown):
    stack, lines = [], []

    def section():
        text = "\n".join(lines).strip()
        return [(" > ".join(heading for _, heading in stack), text)] if text else []

    found = []
    for line in markdown.splitlines():
        match = HEADING.match(line)
        if not match:
            lines.append(line)
            continue
        found += section()
        level = len(match.group(1))
        while stack and stack[-1][0] >= level:
            stack.pop()
        stack.append((level, match.group(2).strip()))
        lines = []
    found += section()
    return found


def chunk_document(markdown, source, max_chars=400):
    """Split a markdown document into Chunks titled with their heading path."""
    chunks = []
    for title, text in _sections(markdown):
        for piece in _pack(text, max_chars):
            position = len(chunks)
            chunks.append(Chunk(id=f"{source}#{position}", source=source, title=title, position=position, text=piece))
    return chunks
