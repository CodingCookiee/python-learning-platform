def chunk_fixed(text, size=500, overlap=100):
    """Split text into windows of at most size characters that overlap by overlap characters."""
    if size <= 0 or not 0 <= overlap < size:
        raise ValueError(f"need size > 0 and 0 <= overlap < size, got size={size}, overlap={overlap}")
    chunks = []
    for start in range(0, len(text), size - overlap):
        chunks.append(text[start:start + size])
        if start + size >= len(text):
            break
    return chunks
