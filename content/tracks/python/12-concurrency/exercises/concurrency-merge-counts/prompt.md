The support team wants to know which words come up most in 2 million support tickets, and the job
will run on a process pool: each worker counts the words in one chunk of tickets, and the partial
counts are merged at the end. Write the two pure functions it needs:

- `count_words(lines)` returns a `Counter` of the words in those lines, lowercased and split on
  whitespace.
- `merge(counts)` takes an iterable of `Counter`s and returns one `Counter` with the totals. It
  must not change any of the counters it's given, and an empty iterable gives an empty `Counter`.

Counting in pieces and merging must give the same answer as counting everything at once:

```python
tickets = ["Refund not received", "Where is my refund", "Card declined again"]
merge(map(count_words, [tickets[:2], tickets[2:]]))
# Counter({"refund": 2, "not": 1, "received": 1, "where": 1, "is": 1, "my": 1, "card": 1, ...})
```

On your machine, `pool.map(count_words, chunks)` would replace `map`, and nothing else changes.
