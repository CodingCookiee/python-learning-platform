import re

HEADING = re.compile(r"#{1,6}\s+(.*)")


def chunk_by_heading(markdown, source):
    """One chunk dict (id, source, title, position, text) per non-empty section of a markdown document."""
    chunks = []
    title, lines = "", []

    def flush():
        text = "\n".join(lines).strip()
        if text:
            position = len(chunks)
            chunks.append({"id": f"{source}#{position}", "source": source, "title": title,
                           "position": position, "text": text})

    for line in markdown.splitlines():
        heading = HEADING.match(line)
        if heading:
            flush()
            title, lines = heading.group(1).strip(), []
        else:
            lines.append(line)
    flush()
    return chunks
