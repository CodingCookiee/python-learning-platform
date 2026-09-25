from collections import Counter


def top_words(text, n):
    """The n most common words in text, as (word, count) pairs, most common first."""
    return Counter(text.lower().split()).most_common(n)
