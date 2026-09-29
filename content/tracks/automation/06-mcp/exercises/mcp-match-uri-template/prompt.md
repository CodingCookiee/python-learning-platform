The wiki server lists resource templates such as `wiki://people/{handle}` and
`orders://{order_id}/invoice`, and it has to work out which template a URI in `resources/read`
belongs to. Write:

```python
match_template(template: str, uri: str) -> dict[str, str] | None
```

Each `{name}` in the template matches one or more characters that aren't `/`. Everything else must
match exactly, and the whole URI must match. Return the variables' values by name, or `None` when
the URI doesn't fit the template.

```python
match_template("wiki://people/{handle}", "wiki://people/ada")               # {"handle": "ada"}
match_template("orders://{order_id}/invoice", "orders://1042/invoice")      # {"order_id": "1042"}
match_template("wiki://people/{handle}", "wiki://people/ada/photo")         # None
```
