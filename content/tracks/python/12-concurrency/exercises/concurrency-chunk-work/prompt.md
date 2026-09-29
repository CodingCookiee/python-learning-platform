Before a process pool can resize 2,000 product photos on 8 cores, someone has to split the list
into 8 pieces of work. Write `chunk(items, parts)`, which splits a list into `parts` contiguous
chunks that are as even as possible:

- Chunk sizes differ by at most one, and the bigger chunks come first.
- Joined back together, the chunks are the original list, in order.
- There's never an empty chunk: with fewer items than `parts`, each item gets a chunk of its own,
  and an empty list gives `[]`.
- `parts` below 1 raises `ValueError`.

```python
chunk(["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg", "f.jpg", "g.jpg"], 3)
# [["a.jpg", "b.jpg", "c.jpg"], ["d.jpg", "e.jpg"], ["f.jpg", "g.jpg"]]
```
