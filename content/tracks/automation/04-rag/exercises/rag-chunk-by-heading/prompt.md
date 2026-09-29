Ledgerline's help-centre articles are markdown, and every heading starts a new topic. Write
`chunk_by_heading(markdown, source)`, which returns one chunk per section as a dict with the keys
`id`, `source`, `title`, `position` and `text`.

- A heading is a line that starts with one to six `#` followed by whitespace. The chunk's `title`
  is the heading's text, stripped, without the `#`s.
- A section's `text` is every line after its heading up to the next heading, joined with newlines
  and stripped. The heading line itself isn't part of the text.
- Text before the first heading is a section with the title `""`.
- Sections whose text is empty are skipped (like an article title followed straight away by a
  subheading).
- `position` counts the chunks you keep, from 0, and `id` is `f"{source}#{position}"`.

```python
article = """# Invoices

## Numbering
Invoice numbers are sequential.
You can change the prefix in Settings > Invoices.

## Sending
Send an invoice by email, or download it as a PDF."""

chunk_by_heading(article, "invoices.md")
# [{"id": "invoices.md#0", "source": "invoices.md", "title": "Numbering", "position": 0,
#   "text": "Invoice numbers are sequential.\nYou can change the prefix in Settings > Invoices."},
#  {"id": "invoices.md#1", "source": "invoices.md", "title": "Sending", "position": 1,
#   "text": "Send an invoice by email, or download it as a PDF."}]
```
