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
        self.counts = [Counter(tokenise(doc)) for doc in docs]
        self.lengths = [sum(counts.values()) for counts in self.counts]
        self.avgdl = sum(self.lengths) / len(self.lengths) if self.lengths else 0.0
        self.df = Counter(term for counts in self.counts for term in counts)

    def idf(self, term):
        n, df = len(self.counts), self.df[term]
        return math.log(1 + (n - df + 0.5) / (df + 0.5))

    def scores(self, query):
        """One BM25 score per document, in document order."""
        terms = set(tokenise(query))
        avgdl = self.avgdl or 1.0
        result = []
        for counts, length in zip(self.counts, self.lengths):
            score = 0.0
            for term in terms:
                tf = counts[term]
                if tf:
                    norm = self.k1 * (1 - self.b + self.b * length / avgdl)
                    score += self.idf(term) * tf * (self.k1 + 1) / (tf + norm)
            result.append(score)
        return result

    def search(self, query, k=5):
        """Up to k (index, score) pairs with a positive score, best first."""
        scores = self.scores(query)
        ranked = sorted((i for i, score in enumerate(scores) if score > 0), key=lambda i: -scores[i])
        return [(i, scores[i]) for i in ranked[:k]]
