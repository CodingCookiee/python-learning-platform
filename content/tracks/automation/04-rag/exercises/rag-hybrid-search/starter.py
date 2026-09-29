import math
import re
from collections import Counter

import numpy as np

TOKEN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
STOP_WORDS = frozenset(
    "a an and are as at be by can do does for from how i in is it my of on or the to what when with you your".split()
)


def tokenise(text):
    return [token for token in TOKEN.findall(text.lower()) if token not in STOP_WORDS]


class BM25:
    """A BM25 keyword index over a list of document strings."""

    def __init__(self, docs, k1=1.5, b=0.75):
        self.k1, self.b = k1, b
        self.counts = [Counter(tokenise(doc)) for doc in docs]
        self.lengths = [sum(counts.values()) for counts in self.counts]
        self.avgdl = sum(self.lengths) / len(self.lengths) if self.lengths else 0.0
        self.df = Counter(term for counts in self.counts for term in counts)

    def scores(self, query):
        n, avgdl, result = len(self.counts), self.avgdl or 1.0, []
        for counts, length in zip(self.counts, self.lengths):
            score = 0.0
            for term in set(tokenise(query)):
                tf = counts[term]
                if tf:
                    idf = math.log(1 + (n - self.df[term] + 0.5) / (self.df[term] + 0.5))
                    score += idf * tf * (self.k1 + 1) / (tf + self.k1 * (1 - self.b + self.b * length / avgdl))
            result.append(score)
        return result

    def search(self, query, k=5):
        """Up to k (index, score) pairs with a positive score, best first."""
        scores = self.scores(query)
        ranked = sorted((i for i, score in enumerate(scores) if score > 0), key=lambda i: -scores[i])
        return [(i, scores[i]) for i in ranked[:k]]


def rrf(rankings, k=60):
    """Fuse rankings (lists of ids, best first) into (id, score) pairs, best first."""
    scores = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(dict.fromkeys(ranking), start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1 / (k + rank)
    return sorted(scores.items(), key=lambda item: -item[1])


def hybrid_search(query, chunks, embed, k=3, candidates=10):
    """Ids of the k best chunks, fusing a vector ranking and a BM25 ranking with RRF."""
    ...
