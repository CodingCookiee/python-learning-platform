---
slug: embeddings-and-similarity
title: Embeddings and cosine similarity
summary: Turn text into vectors whose directions mean something, compare them with cosine similarity, and normalise once so a whole corpus is one matrix multiply.
minutes: 45
exercises:
  - rag-predict-dot-vs-cosine
  - rag-cosine-numpy
  - rag-fix-unnormalised-cosine
  - rag-most-similar
  - rag-near-duplicates
---

Brightwell, a 60-person design studio, wants a bot that answers staff questions from its handbook.
The first question in testing is "can I carry over my holiday?", and the handbook's answer is in a
section called "Unused annual leave". Not one word of the question appears in it. Keyword search
finds nothing; a person finds it instantly, because they match meaning, not spelling. Embeddings
are how code does the same, and they're the first half of every RAG system you'll build.

## An embedding is a list of numbers

An embedding model is a function from text to a fixed-length vector of floats: 1024 numbers, say,
whatever the text's length. Texts with similar meanings get vectors that point in similar
directions. That's the whole contract, and it's enough to search by meaning: embed every passage
once, embed the question, and find the passages whose vectors point closest to the question's.

The drills use a fake embedding function, so here's a toy one that works the same way. Each word
nudges one dimension, so texts that share words point in similar directions:

```python
import re
import zlib

import numpy as np

def toy_embed(texts, dim=16):
    """A stand-in for a real model: one dimension per (hashed) word."""
    vectors = np.zeros((len(texts), dim))
    for row, text in enumerate(texts):
        for word in re.findall(r"[a-z]+", text.lower()):
            vectors[row, zlib.crc32(word.encode()) % dim] += 1.0
    return vectors

vectors = toy_embed(["annual leave allowance", "unused annual leave", "expense receipts"])
vectors.shape, vectors[0]
```

A real model's dimensions aren't words, and you can't read them. They're whatever the model found
useful during training, which is why it can put "holiday" near "annual leave" and a toy can't.

## Why embeddings work

Embedding models are trained on enormous numbers of pairs that belong together: a question and
the passage that answers it, a title and its article, two paraphrases. Training pulls each pair's
vectors together and pushes unrelated texts apart. After billions of those nudges, direction
encodes meaning: "carry over my holiday" and "unused annual leave" end up close because texts like
them appeared as pairs, not because they share characters.

Two consequences matter for your work:

- **Similar isn't the same as relevant.** "How do I cancel my appointment?" and "How do I book an
  appointment?" are very similar, and one doesn't answer the other. Retrieval gets you candidates;
  later lessons add keyword search, reranking and evals to pick the right one.
- **Only compare vectors from the same model.** Two models' vectors live in unrelated spaces.
  Switching models means re-embedding the whole corpus, so record which model made each vector.

```quiz
question: The clinic's bot embeds its policies with model A. A developer embeds the questions with model B, which is cheaper. What happens?
options:
  - "It works, slightly less accurately"
  - "The scores are meaningless: the two models' vectors aren't in the same space"
  - "It works as long as both models have the same number of dimensions"
answer: 1
explain: Each model learns its own space. Even with the same length, dimension 12 of one model has nothing to do with dimension 12 of the other, so the similarities are noise. Documents and queries must use the same model.
```

## Cosine similarity

"Point in similar directions" is measured with the cosine of the angle between two vectors: 1 for
the same direction, 0 for unrelated (at right angles), -1 for opposite. It's the dot product
divided by both lengths:

```python
import numpy as np

def cosine(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

question = np.array([1.0, 2.0, 0.0])
leave = np.array([2.0, 4.0, 0.0])      # same direction, twice as long
expenses = np.array([0.0, 0.0, 3.0])   # at right angles
round(cosine(question, leave), 3), round(cosine(question, expenses), 3)
```

Dividing by the lengths is what makes cosine care about direction only. The dot product alone
also grows with length, and length isn't meaning. Here's the wrong way, with vectors that aren't
unit length (some local models return them like that):

```python
import numpy as np

question = np.array([1.0, 1.0, 0.0])
short_answer = np.array([1.0, 1.0, 0.0])     # exactly on topic
long_page = np.array([3.0, 2.0, 6.0])        # mentions the topic among much else

dots = [float(question @ short_answer), float(question @ long_page)]
cosines = [round(float(question @ v / (np.linalg.norm(question) * np.linalg.norm(v))), 2)
           for v in (short_answer, long_page)]
dots, cosines
```

Ranked by dot product, the long page wins 5 to 2. Ranked by cosine, the on-topic answer wins 1.0
to 0.51. A search that uses raw dot products on unnormalised vectors quietly prefers long,
rambling chunks, and nobody notices until a client asks why the bot keeps quoting the appendix.

> [!JS]
> numpy's `@` is matrix multiplication. There's no JavaScript equivalent built in; think of it as a
> fast, vectorised `reduce` over pairs of numbers.

## Normalise once, then it's one matrix multiply

If every vector has length 1, the denominator is 1 and cosine *is* the dot product. So normalise
each vector once, when you store it, and each search becomes a single matrix-vector product that
scores the whole corpus at once:

```python
import numpy as np

docs = np.array([[3.0, 4.0, 0.0], [0.0, 0.0, 2.0], [1.0, 1.0, 1.0], [0.0, 0.0, 0.0]])
norms = np.linalg.norm(docs, axis=1, keepdims=True)
unit_docs = docs / np.where(norms == 0, 1.0, norms)   # a zero row stays zero, not NaN

query = np.array([6.0, 8.0, 0.0])
unit_query = query / np.linalg.norm(query)

scores = unit_docs @ unit_query
np.round(scores, 3), np.linalg.norm(unit_docs, axis=1)
```

Three details in that example matter in real code:

- `axis=1, keepdims=True` computes one norm per row and keeps the result as a column, so the
  division broadcasts across each row.
- An empty chunk, or one made only of words a model ignores, can embed to all zeros. Dividing by a
  zero norm gives `nan`, and `nan` breaks sorting. Treat a zero vector as similar to nothing.
- Most hosted models already return unit vectors, but normalising again costs nothing and protects
  you when you swap models. Don't rely on it; do it.

A thousand chunks of 1024 floats is a 4 MB matrix, and scoring all of it takes well under a
millisecond. Brute force is the right answer far longer than people expect; lesson 3 covers when
to move to a database.

## The `embed` function your code takes

Everything in this module takes an `embed` parameter: a function from a list of texts to a list of
vectors, `Callable[[list[str]], list[list[float]]]`. It's the same idea as the neutral `llm` from
A2: your retrieval code never knows which provider it's talking to. Here are two real ones, over
plain httpx:

```python norun
import os

import httpx

def voyage_embed(texts, *, input_type="document", model="voyage-3.5"):
    """Voyage AI embeddings. input_type is "document" for passages, "query" for questions."""
    response = httpx.post(
        "https://api.voyageai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {os.environ['VOYAGE_API_KEY']}"},
        json={"model": model, "input": texts, "input_type": input_type},
        timeout=30,
    )
    response.raise_for_status()
    data = sorted(response.json()["data"], key=lambda item: item["index"])
    return [item["embedding"] for item in data]

def openai_embed(texts, *, model="text-embedding-3-small"):
    response = httpx.post(
        "https://api.openai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
        json={"model": model, "input": texts},
        timeout=30,
    )
    response.raise_for_status()
    data = sorted(response.json()["data"], key=lambda item: item["index"])
    return [item["embedding"] for item in data]
```

Both send a whole list in one request and return the vectors with an `index`, which you sort by
so the order always matches the input. Anthropic doesn't offer its own embedding model and
recommends Voyage, so a typical stack is Claude for answers and Voyage for embeddings, or OpenAI for
both. Check each provider's current model list and prices before you pick; they change.

The drills pass `fake_embed` from the course's fakes instead. It's deterministic and offline:
texts that share words (after dropping stop words like "the" and "is", and simple stemming, so
"refunds" matches "refund") point in similar directions. Its vectors have 64 dimensions and are
already normalised. Because it only sees shared words, a test built on it proves your *code* is
right, not that your retrieval would find "holiday" from "leave"; that's what real models and the
evals in lesson 6 are for.

## Where this leaves you

An embedding is a vector whose direction encodes meaning, learned from pairs of texts that belong
together. Compare vectors with cosine similarity, never raw dot products of unnormalised vectors.
Normalise once when you store them, guard against zero vectors, and score a whole corpus with one
matrix multiply. Take `embed` as a parameter so the same code runs against fakes and any
provider. The drills predict dot versus cosine, write cosine with numpy, fix a search that
forgot to normalise, rank FAQ answers for a question, and find near-duplicate FAQ entries.
