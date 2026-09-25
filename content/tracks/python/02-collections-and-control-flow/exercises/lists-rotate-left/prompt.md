The on-call rota is a list of engineers. Each week, the first `n` people move to the back. Write
`rotate_left(items, n)` that returns the rotated list:

```python
rotate_left(["Ada", "Grace", "Linus", "Margaret"], 1)
# ["Grace", "Linus", "Margaret", "Ada"]
```

- `n` can be larger than the list: rotating four people by 5 is the same as rotating them by 1.
- A negative `n` rotates the other way: `rotate_left(["Ada", "Grace", "Linus"], -1)` is
  `["Linus", "Ada", "Grace"]`.
- An empty rota stays empty.
- Return a new list. The original rota must not change.
