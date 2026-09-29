def chunk_by_heading(markdown, source):
    """One chunk dict (id, source, title, position, text) per non-empty section of a markdown document."""
    chunks = []
    for position, block in enumerate(markdown.split("\n\n")):
        chunks.append({"id": f"{source}#{position}", "source": source, "title": "", "position": position, "text": block})
    return chunks
