import re

STOP_WORDS = frozenset(
    "a an and are as at be by can do does for from how i in is it my of on or the to what when with you your".split()
)
TOKEN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def tokenise(text):
    """Lower-case word tokens, hyphenated codes kept whole, stop words dropped."""
    return [token for token in TOKEN.findall(text.lower()) if token not in STOP_WORDS]
