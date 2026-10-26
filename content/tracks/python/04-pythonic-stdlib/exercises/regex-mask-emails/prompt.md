Before support transcripts are shared with the wider team, email addresses must be masked. Write
`mask_emails(text)` that keeps the first character of each address and its domain, and replaces the
rest of the part before the `@` with `***`:

```python
mask_emails("Contact maya@example.org or support@shop.example.com")
# "Contact m***@example.org or s***@shop.example.com"
```

Everything else in the text stays exactly as it was, including a full stop straight after an
address.
