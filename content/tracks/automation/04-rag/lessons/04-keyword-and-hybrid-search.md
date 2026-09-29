---
slug: keyword-and-hybrid-search
title: BM25 and hybrid retrieval
summary: Write BM25 by hand (tokens, IDF, term-frequency saturation and length normalisation), then fuse it with vector search using reciprocal rank fusion.
minutes: 50
exercises:
  - rag-tokenise
  - rag-fix-idf-zero-division
  - rag-bm25
  - rag-reciprocal-rank-fusion
  - rag-hybrid-search
---

A Ledgerline customer pastes "Error E-4012 when I export to Xero" into the support chat. The help
centre has an article that mentions E-4012 by name, but the vector search returns three articles
about exporting in general: to an embedding model, "E-4012" is an unfamiliar string with little
meaning, and "export to Xero" is what the text is *about*. Exact tokens (error codes, SKUs, form
numbers, product and people's names) are where embeddings are weakest and keyword search is
strongest. The standard keyword ranking is **BM25**, and you'll write it from its parts. Then you'll
combine the two, which is what most production RAG systems do.

## Tokenise

Keyword search compares words, so first decide what a word is. Lower-case the text, keep runs of
letters and digits, keep hyphenated codes like `e-4012` whole, and drop the very common words that
match everything:

```python
import re

STOP_WORDS = {"a", "an", "and", "the", "to", "of", "in", "is", "i", "my", "when", "for", "on", "it"}
TOKEN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")

def tokenise(text):
    return [t for t in TOKEN.findall(text.lower()) if t not in STOP_WORDS]

tokenise("Error E-4012 when I export to Xero"), tokenise("Exports to Xero fail with error E-4012.")
```

Stemming ("exports" to "export") would make those two lists overlap more. It's a trade-off: it
helps recall on prose and hurts precision on codes and names. Keep it simple until an eval says
otherwise.

## IDF: rare words matter more

"Error" appears in forty help articles; "E-4012" in one. A match on the rare term says far more,
so each term gets an **inverse document frequency** weight. The textbook version is
`log(N / df)`, where `N` is the number of documents and `df` how many contain the term. It has two
problems you'll hit on day one:

```python raises
import math

docs = [["export", "xero", "error"], ["invoice", "error"], ["reminder", "error"]]
N = len(docs)

def naive_idf(term):
    df = sum(term in doc for doc in docs)
    return math.log(N / df)

print("error:", naive_idf("error"))       # in every document: log(1) = 0.0
print("vat:", naive_idf("vat"))           # in no document at all
```

A term in every document gets weight zero, and a query term that appears nowhere divides by zero.
BM25's IDF adds a half to each count and a one inside the log, so it's always positive and always
defined:

```python
import math

N = 3
def bm25_idf(df):
    return math.log(1 + (N - df + 0.5) / (df + 0.5))

{df: round(bm25_idf(df), 3) for df in range(0, 4)}
```

## Term frequency, with saturation

A document that says "Xero" five times is probably more about Xero than one that says it once,
but not five times more, and a page that repeats a keyword forty times shouldn't win on that
alone. BM25 lets the term frequency `tf` count with diminishing returns:
`tf * (k1 + 1) / (tf + k1)`. It starts at 1 for one occurrence and levels off towards `k1 + 1`:

```python
k1 = 1.5
[(tf, round(tf * (k1 + 1) / (tf + k1), 2)) for tf in (1, 2, 3, 5, 10, 40)]
```

`k1` (usually 1.2 to 2.0) sets how quickly it saturates: a small `k1` means "mentioning it at all is
what counts", a large one lets repetition keep mattering.

## Length normalisation

A 3,000-word article mentions everything a few times. BM25 compares each document's length `dl`
with the average `avgdl`, and makes long documents need more occurrences for the same score, by
replacing `k1` in the denominator with `k1 * (1 - b + b * dl / avgdl)`:

```python
k1, b, avgdl = 1.5, 0.75, 100

def tf_part(tf, dl):
    return tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl / avgdl))

{"short page, 1 mention": round(tf_part(1, 40), 2), "long page, 1 mention": round(tf_part(1, 400), 2),
 "long page, 4 mentions": round(tf_part(4, 400), 2)}
```

`b` (usually 0.75) is how much length counts: `b = 0` ignores length, `b = 1` normalises fully.

## BM25, all together

A document's score for a query is the sum, over the query's terms, of that term's IDF times its
saturated, length-normalised frequency in the document:

```python
import math
import re
from collections import Counter

TOKEN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
STOP_WORDS = {"a", "an", "and", "the", "to", "of", "in", "is", "i", "when", "for", "with"}

def tokenise(text):
    return [t for t in TOKEN.findall(text.lower()) if t not in STOP_WORDS]

articles = [
    "Exporting to Xero: connect your Xero account in Settings, then export invoices.",
    "Error E-4012 means the Xero connection expired. Reconnect Xero and export again.",
    "Exporting to CSV: download all invoices as a spreadsheet.",
    "Error E-2001 means a payment failed.",
]
docs = [Counter(tokenise(a)) for a in articles]
lengths = [sum(d.values()) for d in docs]
avgdl, N, k1, b = sum(lengths) / len(lengths), len(docs), 1.5, 0.75

def bm25(query, i):
    score = 0.0
    for term in set(tokenise(query)):
        df = sum(term in d for d in docs)
        idf = math.log(1 + (N - df + 0.5) / (df + 0.5))
        tf = docs[i][term]
        score += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * lengths[i] / avgdl))
    return round(score, 3)

[bm25("Error E-4012 when I export to Xero", i) for i in range(N)]
```

The E-4012 article wins clearly, and the E-2001 article gets a little credit for "error". Notice
what BM25 needs at query time: document frequencies and lengths, computed once when you build the
index, and a `Counter` per document. The drills build that as a class. Libraries such as
`rank-bm25`, and the full-text search in Postgres, Elasticsearch and OpenSearch, all implement
variations of this formula.

```quiz
question: A support query is "invoice". Every one of Ledgerline's 140 articles contains the word invoice. What does BM25 do?
options:
  - "Crashes, because the IDF divides by zero"
  - "Gives every article a small, similar score, so the ranking is mostly decided by length and frequency"
  - "Returns no results"
answer: 1
explain: With df = N, the BM25 IDF is log(1 + 0.5 / (N + 0.5)), small but positive. A term that's everywhere barely separates documents, which is correct, and it's why a one-word query like this is better served by vector search or by asking the user for more detail.
```

## Hybrid retrieval with reciprocal rank fusion

Now you have two rankings: vector search, good at meaning and paraphrase, and BM25, good at exact
tokens. You can't just add their scores: cosine similarities sit between -1 and 1, BM25 scores are
unbounded and depend on the corpus, so whichever scale is bigger would win. **Reciprocal rank
fusion** (RRF) ignores the scores and uses only the ranks. Each list gives a document
`1 / (k + rank)`, ranks counting from 1, and the fused score is the sum:

```python
def rrf(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1 / (k + rank)
    return sorted(scores.items(), key=lambda item: -item[1])

vector_ranking = ["xero-export", "csv-export", "e-4012"]
bm25_ranking = ["e-4012", "e-2001", "xero-export"]
[(doc_id, round(score, 4)) for doc_id, score in rrf([vector_ranking, bm25_ranking])]
```

The two articles both lists found tie at the top, each first in one list and third in the other.
Documents that both methods like rise; a document only one method found still gets in. The constant `k = 60` comes from the original paper and damps the difference between rank 1
and rank 2, so one list's favourite can't dominate. It's a remarkably robust default, which is why
it's the first thing to try. Weighted score blending is the alternative, and needs the scores
normalised and the weight tuned on an eval.

In practice: take the top 20 to 50 from each method, fuse, keep the top few (or hand them to a
reranker, next lesson). Postgres can do both halves in one database, with pgvector for vectors and
its built-in full-text search (`tsvector`, `ts_rank`) for keywords, though `ts_rank` isn't BM25.

## Where this leaves you

Keyword search catches the exact tokens embeddings miss. BM25 scores a document as a sum over
query terms of IDF (rare terms weigh more, never zero, never a division by zero) times a term
frequency that saturates with `k1` and is normalised for length with `b`. Hybrid retrieval runs
both searches and fuses the rankings with RRF, which needs no score calibration. The drills write
the tokeniser, fix a crashing IDF, build a BM25 index, implement RRF, and put hybrid search
together.
