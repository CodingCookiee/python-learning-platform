To see what n8n does with a parameter like `New lead: {{ $json.name }}`, build a small renderer
for the `$json` part of its expression language. Write `render(template, item)`, where `item` is
an n8n item (`{"json": {...}}`).

An expression is `{{ ... }}` (spaces inside the braces are optional) containing a path that starts
with `$json` and continues with any mix of `.key` and `[index]` steps:

```python
item = {"json": {"name": "Amira Haddad", "body": {"company": "Haddad Physio"},
                 "lines": [{"sku": "SEO-AUDIT", "qty": 1}], "score": 85}}

render("New lead: {{ $json.name }} ({{$json.body.company}})", item)
# "New lead: Amira Haddad (Haddad Physio)"
render("First line: {{ $json.lines[0].sku }}", item)
# "First line: SEO-AUDIT"
render("{{ $json.score }}", item)
# 85, an int: a template that is exactly one expression keeps the value's type
```

- A path that doesn't exist (a missing key, an index past the end, a step into something that
  isn't a dict or list) gives `None`.
- When the template is exactly one expression, return the value itself, `None` included.
- Otherwise, return a string with each expression replaced by `str(value)`, or by `""` for `None`.
- Text outside `{{ }}` is left exactly as it is.
