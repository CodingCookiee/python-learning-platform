def chunk_fixed(text, size=500, overlap=100):
    """Split text into windows of at most size characters that overlap by overlap characters."""
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start + size])
        start += size + overlap  # move past the overlap
    return chunks
