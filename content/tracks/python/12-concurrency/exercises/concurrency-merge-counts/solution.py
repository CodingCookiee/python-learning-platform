from collections import Counter


def count_words(lines):
    """A Counter of the lowercased, whitespace-separated words in the lines."""
    return Counter(word for line in lines for word in line.lower().split())


def merge(counts):
    """One Counter with the totals of all the counters, without changing any of them."""
    total = Counter()
    for count in counts:
        total += count
    return total
