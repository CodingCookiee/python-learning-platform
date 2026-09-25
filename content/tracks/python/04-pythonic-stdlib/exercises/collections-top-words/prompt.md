Customer reviews come in as one long string. Write `top_words(text, n)` that returns the `n` most
common words as `(word, count)` pairs, most common first. Words are separated by spaces, and
`"Fast"` and `"fast"` are the same word.

```python
top_words("fast delivery fast refund Fast support", 2)
# [("fast", 3), ("delivery", 1)]
```

When two words have the same count, the one that appears first in the text comes first.
