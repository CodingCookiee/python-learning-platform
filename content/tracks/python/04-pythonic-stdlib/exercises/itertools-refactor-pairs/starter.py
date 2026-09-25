def gaps(timestamps):
    """Seconds between each visit and the next: [0, 30, 45] -> [30, 15]."""
    result = []
    for i in range(len(timestamps) - 1):
        result.append(timestamps[i + 1] - timestamps[i])
    return result


def variants(sizes, colours):
    """Every size-colour SKU: ["S-red", "S-blue", "M-red", ...]."""
    skus = []
    for size in sizes:
        for colour in colours:
            skus.append(f"{size}-{colour}")
    return skus
