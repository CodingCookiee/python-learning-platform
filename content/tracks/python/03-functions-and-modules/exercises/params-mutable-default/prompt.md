The help desk tags each support ticket with `add_tag(tag, tags)`. If no list is given, it's meant
to start a new one. Instead, every new ticket inherits the tags of the tickets before it:

```python
add_tag("urgent")       # ["urgent"]
add_tag("billing")      # ["urgent", "billing"]   <- should be ["billing"]
```

Fix `add_tag` so that:

- each call without a `tags` list starts a brand-new list,
- a list the caller passes in (even an empty one) is the list that gets the tag, and is returned,
- a tag that's already on the list isn't added twice.
