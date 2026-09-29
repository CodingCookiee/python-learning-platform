def total_bytes(lines):
    """The total of the byte counts at the end of each log line, skipping "-"."""
    sizes = []
    for line in lines:
        size = line.rsplit(" ", 1)[1]
        if size != "-":
            sizes.append(int(size))
    return sum(sizes)
