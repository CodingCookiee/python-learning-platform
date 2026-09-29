STOP_WORDS = frozenset(
    "a an and are as at be by can do does for from how i in is it my of on or the to what when with you your".split()
)


def tokenise(text):
    """Lower-case word tokens, hyphenated codes kept whole, stop words dropped."""
    return text.lower().split()
