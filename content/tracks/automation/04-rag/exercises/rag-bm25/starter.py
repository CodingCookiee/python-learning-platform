import math
import re
from collections import Counter

TOKEN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
STOP_WORDS = frozenset(
    "a an and are as at be by can do does for from how i in is it my of on or the to what when with you your".split()
)


def tokenise(text):
    """Lower-case word tokens, hyphenated codes kept whole, stop words dropped."""
    return [token for token in TOKEN.findall(text.lower()) if token not in STOP_WORDS]


class BM25:
    """A BM25 keyword index over a list of document strings."""

    def __init__(self, docs, k1=1.5, b=0.75):
        self.k1, self.b = k1, b
        self.docs = [tokenise(doc) for doc in docs]

    def scores(self, query):
        """One BM25 score per document, in document order."""
        return [float(sum(doc.count(term) for term in tokenise(query))) for doc in self.docs]

    def search(self, query, k=5):
        """Up to k (index, score) pairs with a positive score, best first."""
        scores = self.scores(query)
        return sorted(enumerate(scores), key=lambda pair: -pair[1])[:k]
