Every tool result goes into the agent's history and is resent on each later step. Write
`clip(text, limit=2000)`, the last line of defence before a result goes in.

- Text of `limit` characters or fewer comes back unchanged.
- Longer text is cut to its first `limit` characters, followed by a new line and this note (the
  numbers with thousands separators):

```text
[cut: showing 2,000 of 12,345 characters. Ask for less: a narrower query or the next page.]
```

```python
clip("Call with Priya: wants SSO before renewal.")   # unchanged
len(clip("x" * 12_345))                               # 2,000 characters plus the note
```
