A mutable default argument is created once, when `def` runs, and shared by every call. ruff's rule
**B006** reports them. Write `find_mutable_defaults(source)`, which returns one message per mutable
default, sorted by position:

```text
<line>:<column>: B006 Do not use mutable data structures for argument defaults
```

The position is where the default value starts (both counted from 1). Check every function,
method, `async def` and `lambda`, including keyword-only parameters. A default is mutable if it is:

- a list, dict or set display (`[]`, `{}`, `{"a"}`), or a list, dict or set comprehension;
- a call to `list`, `dict`, `set`, `defaultdict`, `deque`, `Counter` or `OrderedDict`, written
  plainly or through a module (`collections.deque()`).

Tuples, strings, numbers, `None` and `frozenset()` are immutable and fine. As in ruff, a finding is
silenced by a `# noqa` or `# noqa: B006` comment on the line the default is on.

```python
source = """def add_tag(order, tag, tags=[]):
    tags.append(tag)
    return tags
"""
find_mutable_defaults(source)
# ["1:30: B006 Do not use mutable data structures for argument defaults"]
```
