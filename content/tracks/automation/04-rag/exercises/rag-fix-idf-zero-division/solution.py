import math


def idf(term, docs):
    """How much a match on term is worth: higher for rarer terms. docs is a list of token lists."""
    n = len(docs)
    df = sum(1 for doc in docs if term in doc)
    return math.log(1 + (n - df + 0.5) / (df + 0.5))
