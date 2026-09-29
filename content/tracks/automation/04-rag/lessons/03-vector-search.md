---
slug: vector-search
title: Vector search, from scratch to pgvector
summary: Build a small in-memory vector index with batched, cached embedding and metadata filters, then do the same in Postgres with pgvector and an HNSW index.
minutes: 50
exercises:
  - rag-top-k-indices
  - rag-vector-index
  - rag-embedding-cache
  - rag-refactor-vectorised-search
  - rag-filtered-search
---

Harbour Physio's policy Q&A has 1,800 chunks: cancellation rules, fees, insurance, safeguarding,
data protection. Every question needs the five chunks closest to it, in a few milliseconds, and
re-running the ingestion every night shouldn't mean paying to embed 1,800 unchanged chunks again.
That's a vector index: store vectors with their chunks, and search them by similarity. You'll
build one in about forty lines, then see the same thing in Postgres.

## The index, in forty lines

A vector index needs two operations: **add** chunks (embed them and store the vectors) and
**search** (embed the question, score every stored vector, return the best `k`). With normalised
vectors in a numpy matrix, search is one matrix multiply:

```python
import re
import zlib

import numpy as np

def toy_embed(texts, dim=32):
    vectors = np.zeros((len(texts), dim))
    for row, text in enumerate(texts):
        for word in re.findall(r"[a-z]+", text.lower()):
            vectors[row, zlib.crc32(word.encode()) % dim] += 1.0
    return vectors.tolist()

class VectorIndex:
    def __init__(self, embed, dim=32):
        self.embed = embed
        self.chunks = []
        self.matrix = np.zeros((0, dim))

    def add(self, chunks):
        vectors = np.asarray(self.embed([c["text"] for c in chunks]), dtype=float)
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        self.matrix = np.vstack([self.matrix, vectors / np.where(norms == 0, 1.0, norms)])
        self.chunks.extend(chunks)

    def search(self, query, k=3):
        q = np.asarray(self.embed([query])[0], dtype=float)
        q = q / (np.linalg.norm(q) or 1.0)
        scores = self.matrix @ q
        best = np.argsort(-scores, kind="stable")[:k]
        return [(self.chunks[i]["id"], round(float(scores[i]), 3)) for i in best]

index = VectorIndex(toy_embed)
index.add([
    {"id": "fees#0", "text": "A first assessment costs 65 pounds and follow up sessions cost 50 pounds."},
    {"id": "cancel#0", "text": "Cancel at least 24 hours before your appointment or pay the full fee."},
    {"id": "parking#0", "text": "There is free parking behind the clinic."},
])
index.search("how much does a follow up session cost", k=2)
```

That's a real, useful index. It isn't approximate: it scores every vector, so it always returns
the true top `k`. On a laptop, numpy scores 100,000 vectors of 1,024 floats in a few
milliseconds. For most client projects (a handbook, a help centre, a policy library) brute force
is the right answer, and it has no index to tune and no service to run.

## Top-k with numpy

`np.argsort(-scores)` sorts everything to take the first few. For a big corpus,
`np.argpartition` finds the best `k` without sorting the rest; you then sort just those:

```python
import numpy as np

scores = np.array([0.12, 0.81, 0.45, 0.81, 0.07, 0.66])
k = 3

by_sort = np.argsort(-scores, kind="stable")[:k]
top = np.argpartition(-scores, k - 1)[:k]            # the best k, in no particular order
by_partition = top[np.argsort(-scores[top], kind="stable")]
by_sort.tolist(), sorted(by_partition.tolist(), key=lambda i: -scores[i])
```

`kind="stable"` makes ties come out in their original order, so results don't flicker between
runs. Negating the scores is the usual trick for "descending", since numpy only sorts ascending.

## Batch the embedding calls

Embedding one chunk per request is the most common slow, expensive mistake in ingestion code:
1,800 chunks is 1,800 round trips. Every provider takes a list, so send them in batches:

```python
from itertools import batched

calls = []
def counting_embed(texts):
    calls.append(len(texts))
    return [[float(len(t))] for t in texts]

chunks = [f"Policy paragraph {n}" for n in range(1, 251)]
vectors = []
for batch in batched(chunks, 100):
    vectors.extend(counting_embed(list(batch)))
len(vectors), calls
```

Three calls instead of 250. Providers cap a request by the number of inputs and the total tokens
(hundreds to a couple of thousand inputs, depending on the provider and model), so keep the batch
size a parameter and check the limits page. Batching also makes the retries from A2 matter more:
a failed batch is 100 chunks, so retry it rather than starting ingestion over.

## Cache what you've already embedded

Nightly re-ingestion re-chunks every document, and most chunks haven't changed. Key a cache on
the model and the exact text, and only send what's missing:

```python
import hashlib

cache = {}
sent = []

def embed_with_cache(texts, embed, model="toy-1"):
    keys = [hashlib.sha256(f"{model}\n{text}".encode()).hexdigest() for text in texts]
    missing = [text for key, text in dict(zip(keys, texts)).items() if key not in cache]
    if missing:
        for text, vector in zip(missing, embed(missing)):
            cache[hashlib.sha256(f"{model}\n{text}".encode()).hexdigest()] = vector
    return [cache[key] for key in keys]

def fake(texts):
    sent.append(list(texts))
    return [[float(len(t))] for t in texts]

embed_with_cache(["Cancel 24 hours ahead.", "Parking is free."], fake)
embed_with_cache(["Parking is free.", "Fees are listed below.", "Parking is free."], fake)
sent
```

The second call sent only the one new text, once. The model is part of the key because vectors
from different models aren't comparable (lesson 1). In production the cache lives somewhere
durable, such as a SQLite table or the vector database itself; the logic doesn't change.

```quiz
question: The cache key is a hash of the chunk's text only, not the model. What goes wrong when you upgrade to a new embedding model?
options:
  - "Nothing: the text is the same, so the vector is the same"
  - "Old chunks keep their old model's vectors while new questions use the new model, and similarity between them is meaningless"
  - "The cache gets bigger"
answer: 1
explain: A vector only means something next to vectors from the same model. With the model in the key, an upgrade misses the cache and re-embeds everything, which is exactly what has to happen.
```

## pgvector: vector search in Postgres

Move to a database when you need persistence without re-embedding on start-up, SQL filters on
metadata, many writers, or millions of chunks. If the client already runs Postgres, the
**pgvector** extension adds a `vector` column type, distance operators and indexes, next to the
rest of their data:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
    id        text PRIMARY KEY,           -- "cancellations.md#3"
    source    text NOT NULL,
    title     text NOT NULL,
    position  int  NOT NULL,
    content   text NOT NULL,
    embedding vector(1024) NOT NULL       -- the model's dimension
);

-- Approximate nearest-neighbour index for cosine distance
CREATE INDEX chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);

-- The five closest chunks from two sources. <=> is cosine distance (1 - cosine similarity).
SELECT id, title, content, 1 - (embedding <=> $1) AS score
FROM chunks
WHERE source = ANY($2)
ORDER BY embedding <=> $1
LIMIT 5;
```

`<=>` is cosine distance, `<#>` negative inner product and `<->` Euclidean distance; the index's
operator class (`vector_cosine_ops`) must match the operator you order by, or Postgres can't use
it. **HNSW** is a graph index: it finds very close neighbours quickly without scanning everything,
but it's *approximate*, so it can miss a true top-5 result. Raise `hnsw.ef_search` (default 40)
for better recall at some speed cost. Filters interact with it too: HNSW fetches the nearest
candidates first and the `WHERE` then discards some, so a narrow filter can return fewer than five
rows. pgvector 0.8 and later can keep scanning (`SET hnsw.iterative_scan = relaxed_order`), and on
older versions a larger `ef_search` helps.

From Python, with psycopg 3 and the `pgvector` package, which teaches psycopg to send numpy arrays
as vectors:

```python norun
import os

import numpy as np
import psycopg
from pgvector.psycopg import register_vector

conn = psycopg.connect(os.environ["DATABASE_URL"], autocommit=True)
conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
register_vector(conn)

def add_chunks(chunks, embed):
    vectors = embed([c["text"] for c in chunks])
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO chunks (id, source, title, position, content, embedding) "
            "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO UPDATE "
            "SET content = EXCLUDED.content, embedding = EXCLUDED.embedding",
            [(c["id"], c["source"], c["title"], c["position"], c["text"], np.array(v)) for c, v in zip(chunks, vectors)],
        )

def search(question, embed, sources, k=5):
    query = np.array(embed([question])[0])
    return conn.execute(
        "SELECT id, content, 1 - (embedding <=> %s) AS score FROM chunks "
        "WHERE source = ANY(%s) ORDER BY embedding <=> %s LIMIT %s",
        (query, sources, query, k),
    ).fetchall()
```

The `embed` parameter is the same function as in the browser drills, so your chunking, caching
and evaluation code doesn't change when the storage does.

## Do it on your machine

1. Start Postgres with pgvector in Docker:
   `docker run --name rag-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d pgvector/pgvector:pg17`.
2. In a new project: `uv add "psycopg[binary]" pgvector numpy`, and set
   `DATABASE_URL=postgresql://postgres:dev@localhost:5432/postgres`.
3. Create the table and HNSW index above, with `vector(64)` so you can test with a small embed
   function first (a hashing one like the toy in this lesson), then switch to your real model's
   dimension.
4. Load the chunks from your chunking drill for a few markdown files with `add_chunks`, and run
   `search`. Then run `EXPLAIN ANALYZE` on the query and check the plan uses
   `chunks_embedding_hnsw`.
5. Compare with brute force: drop the index, run the same ten questions, and check the top five
   match. With a few thousand rows they will; the index earns its keep at hundreds of thousands.

## Where this leaves you

A vector index stores normalised vectors next to their chunks and answers a search with one
matrix multiply and a top-k. Brute force is exact and fast enough for most client corpora.
Embed in batches, and cache by model and text so re-ingestion only pays for what changed. When you
need persistence, SQL filters or scale, pgvector gives you the same search in Postgres with an
approximate HNSW index, whose recall and filters you now know to check. The drills pick the top
k, build the index, write the cache, vectorise a slow search, and add metadata filters.
