Brightwell's staff handbook is one long markdown file with nested headings: "Leave" has
"Annual leave", "Sick leave" and "Parental leave" under it, and some sections run for pages. Write
`chunk_document(markdown, source, max_chars=400)`, which returns a list of `Chunk`s (the frozen
dataclass in the starter), and finish `Chunk.for_embedding()`.

**Titles are heading paths.** A heading of level *n* (the number of `#`s) sits under the most
recent heading of each lower level, and its chunk's `title` joins them with `" > "`:
`"Staff handbook > Leave > Parental leave"`. A new heading replaces any previous heading of the
same or a deeper level.

**Sections** are split as in the heading drill: the lines after a heading up to the next one,
joined with newlines and stripped; empty sections are skipped; text before the first heading has
the title `""`.

**Long sections are split.** A section longer than `max_chars` is split into sentences (ending at
`.`, `!` or `?` followed by whitespace), packed greedily into pieces of at most `max_chars` joined
by single spaces, with no overlap. A single sentence longer than `max_chars` is a piece on its own.
Shorter sections stay exactly as they are.

**Metadata.** `position` counts chunks across the whole document from 0, and `id` is
`f"{source}#{position}"`.

**`for_embedding()`** returns the text to embed: the title, a blank line, then the text
(`f"{title}\n\n{text}"`), or just the text when the title is `""`.

```python
handbook = """# Staff handbook
## Leave
### Annual leave
Full-time staff get 25 days a year, plus bank holidays.
### Parental leave
Speak to HR at least 15 weeks before your due date."""

[(c.id, c.title) for c in chunk_document(handbook, "handbook.md")]
# [("handbook.md#0", "Staff handbook > Leave > Annual leave"),
#  ("handbook.md#1", "Staff handbook > Leave > Parental leave")]
```
