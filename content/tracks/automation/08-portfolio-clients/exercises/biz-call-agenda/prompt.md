A discovery call that runs over its slot without covering next steps is the most common way to
lose a good lead. Put the plan in writing, with times, and share it with the client before the call.

Write `call_agenda(sections, *, start="00:00")`. `sections` is a list of `(title, minutes)` pairs.
Return one line per section, `"HH:MM-HH:MM Title"`, starting at `start` (a `"HH:MM"` string), each
section starting when the previous one ends.

```python
call_agenda([("Introductions", 3), ("Their business", 7), ("The process", 12),
             ("Success and constraints", 5), ("Next steps", 3)], start="14:00")
# ["14:00-14:03 Introductions",
#  "14:03-14:10 Their business",
#  "14:10-14:22 The process",
#  "14:22-14:27 Success and constraints",
#  "14:27-14:30 Next steps"]
```
