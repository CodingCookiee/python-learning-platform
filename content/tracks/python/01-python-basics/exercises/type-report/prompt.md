Write `describe(value)` that returns a sentence naming the value and its type:

```python
describe(42)        # "42 is a int"
describe("42")      # "'42' is a str"
describe([1, 2])    # "[1, 2] is a list"
```

The value is shown the way Python's REPL shows it, so strings keep their quotes. Two tools you
haven't seen yet:

- `type(value).__name__` is the type's name as text, like `"int"`.
- Inside an f-string, `{value!r}` inserts the value's REPL form (`'42'`, with quotes) instead of
  its plain text (`42`). f-strings get a full lesson soon.

(Yes, "a int" is bad English. Grammar can wait; the point is the type.)
