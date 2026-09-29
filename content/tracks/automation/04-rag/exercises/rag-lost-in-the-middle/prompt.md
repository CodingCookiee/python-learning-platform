Models use the start and end of a long context more reliably than the middle. Write
`order_for_context(ranked)`, which takes chunks ranked best first and returns them in the order
to put in the prompt: the best first, the second best last, the third second, the fourth second
to last, and so on, so the weakest chunks end up in the middle.

- Return a new list; don't change `ranked`.
- Works for any number of chunks, including none.

```python
order_for_context(["best", "second", "third", "fourth", "fifth"])
# ["best", "third", "fifth", "fourth", "second"]
```
