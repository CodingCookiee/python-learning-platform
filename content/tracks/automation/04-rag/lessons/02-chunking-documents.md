---
slug: chunking-documents
title: Chunking documents
summary: Split documents into passages that each mean one thing, by size with overlap, by heading or by sentence, and keep the source, title and position on every one.
minutes: 45
exercises:
  - rag-predict-chunk-windows
  - rag-fix-chunk-overlap
  - rag-chunk-by-heading
  - rag-sentence-chunks
  - rag-chunk-handbook
---

Ledgerline, an invoicing app, has a help centre of 140 articles, some of them 3,000 words long.
Embed each article as one vector and the one about "Invoices" averages numbering, sending,
reminders, credit notes and tax into one direction that's close to none of them. The answer to
"can I change my invoice number prefix?" is one paragraph in the middle, and that paragraph is what
you want to find, show the model and cite. Splitting documents into those paragraph-sized
passages is **chunking**, and more RAG systems fail here than anywhere else.

## Why chunk at all

Three reasons, and they pull in the same direction:

- **Retrieval precision.** An embedding summarises its whole input. A chunk about one thing has a
  vector that points at that thing.
- **Context cost.** You pay for every token you put in front of the model. Five focused paragraphs
  are cheaper, and better answered, than five whole articles.
- **Citations.** "See the Invoices article" is a weak citation. "Numbering, paragraph 2" is one a
  support agent can check in five seconds.

Embedding models also have an input limit (a few thousand tokens for most), so very long
documents have to be split anyway.

## Fixed-size windows with overlap

The simplest splitter cuts every `size` characters. Cut blindly and an answer that straddles a
boundary is in neither chunk, so consecutive windows **overlap**: each one starts `size - overlap`
characters after the previous one.

```python
text = ("Invoice numbers are sequential. You can change the prefix in Settings. "
        "Numbers never repeat, even after you delete an invoice.")
size, overlap = 50, 15
step = size - overlap

chunks = []
for start in range(0, len(text), step):
    chunks.append(text[start:start + size])
    if start + size >= len(text):     # this window reached the end: stop
        break

for chunk in chunks:
    print(repr(chunk))
```

Each window repeats the last 15 characters of the one before. The `break` matters: without it,
the loop emits extra windows near the end that sit entirely inside the previous one. And the
overlap must be smaller than the size, or `step` is zero or negative and the loop never moves.

Fixed windows are predictable and work on any text, including OCR output with no structure at
all. Their weakness is visible in the output: they cut words and sentences in half, and the
chunk "ge the prefix in Settings. Numbers never re" embeds as nonsense. Production systems count
tokens rather than characters (with the provider's tokeniser, or about four characters per token),
but the arithmetic is the same.

## Split on the document's own structure

Most business documents already say where one topic ends: headings. Splitting a markdown article
at its headings gives chunks that each answer one question, and the heading becomes the chunk's
title for free:

```python
import re

article = """# Invoices
Create an invoice from the Invoices page, or duplicate an old one.

## Numbering
Invoice numbers are sequential. You can change the prefix in Settings > Invoices.

## Sending
Send an invoice by email, or download it as a PDF."""

sections, title, lines = [], "", []
for line in article.splitlines():
    heading = re.match(r"#{1,6}\s+(.*)", line)
    if heading:
        if "".join(lines).strip():
            sections.append((title, "\n".join(lines).strip()))
        title, lines = heading.group(1).strip(), []
    else:
        lines.append(line)
if "".join(lines).strip():
    sections.append((title, "\n".join(lines).strip()))
sections
```

Paragraphs (blank lines) are the next level down, for long sections. HTML pages split on `<h2>`
and `<p>`; PDFs are harder, because the structure is gone, and are worth converting to markdown
with a layout-aware tool before chunking.

## Sentence-aware packing

Sections vary wildly in length: a two-line "Sending" and a 1,500-word "Tax rules". A good middle
path packs whole sentences into chunks up to a size limit, so no chunk cuts a sentence and none is
enormous:

```python
import re

text = ("Late payment reminders are sent automatically. The first goes 3 days after the due date. "
        "The second goes 10 days after. You can turn reminders off for a single client. "
        "Reminders are never sent for invoices marked as paid.")
sentences = re.split(r"(?<=[.!?])\s+", text.strip())

chunks, current = [], []
for sentence in sentences:
    if current and len(" ".join(current + [sentence])) > 100:
        chunks.append(" ".join(current))
        current = current[-1:]            # carry one sentence over, as overlap
    current.append(sentence)
chunks.append(" ".join(current))
chunks
```

The regex splits after `.`, `!` or `?` followed by whitespace, which is right for most help-centre
prose and wrong for "e.g. the Pro plan" or "Dr. Patel". Good enough for a start; spot-check your
chunks and switch to a proper sentence splitter if abbreviations bite. Carrying the last sentence
into the next chunk is overlap at sentence granularity: an answer that spans two sentences is
whole in at least one chunk.

## Trade-offs

| Choice | Gains | Costs |
|--------|-------|-------|
| Small chunks (a few sentences) | Precise vectors, cheap context, tight citations | Lose surrounding context; an answer may need several |
| Large chunks (whole sections) | Context stays together | Diluted vectors, more tokens per answer |
| More overlap | Answers on a boundary survive | More chunks to embed and store, near-duplicate results |
| Structure-aware | Chunks match topics, titles for free | Needs structure; uneven sizes |

A sensible starting point is structure first, then sentence packing to roughly 200 to 500 tokens
with one or two sentences of overlap. Then measure: lesson 6 turns "which chunking is better?"
into a number, and that's the only way to settle it.

```quiz
question: A policy PDF has a table of cancellation fees. Fixed 500-character windows cut it in the middle, so a question about the fee for "less than 24 hours" retrieves a chunk that holds only the table's bottom half with no header row. What's the best fix?
options:
  - "Increase the overlap to 400 characters"
  - "Keep tables whole as their own chunks, with the table's heading and header row in each"
  - "Use smaller windows so the table is spread over more chunks"
answer: 1
explain: Overlap only helps text that reads fine in pieces. A table's rows mean nothing without its header, so it should be one chunk (or split by rows with the header repeated), labelled with the section it's in.
```

## Metadata on every chunk

A chunk isn't just text. Give each one the facts you'll need later:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Chunk:
    id: str          # stable: "invoices.md#2"
    source: str      # which document it came from
    title: str       # the section heading
    position: int    # its order within the document
    text: str

chunk = Chunk(id="invoices.md#1", source="invoices.md", title="Numbering", position=1,
              text="Invoice numbers are sequential. You can change the prefix in Settings > Invoices.")
f"{chunk.title}\n\n{chunk.text}"
```

- **`source` and `title`** make citations readable and let you filter ("only the UK handbook").
- **`position`** lets you show neighbouring chunks, or put a document's chunks back in order.
- **A stable `id`** built from source and position means re-chunking the same document gives the
  same ids, which evals (lesson 6) and re-indexing (lesson 7) rely on.
- Add whatever the client filters on: product, region, audience, `updated_at`.

The last line shows a cheap, effective trick: embed the title together with the text. "Invoice
numbers are sequential" says nothing about *which* numbers on its own, and "Numbering" as a header
makes that chunk findable from "invoice number prefix". Store the plain text for display and embed
the titled version.

## Where this leaves you

Chunk so each passage means one thing. Fixed windows with overlap work on anything but cut
sentences; heading and paragraph splits follow the author's own topics; sentence packing keeps
sizes even without cutting sentences. Overlap must be smaller than the size, and the last window
shouldn't repeat the one before. Give every chunk a stable id, its source, title and position,
and embed the title with the text. The drills predict window positions, fix a splitter whose
overlap goes the wrong way, split by heading, pack sentences, and chunk a whole handbook.
