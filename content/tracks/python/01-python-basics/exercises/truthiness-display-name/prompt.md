The account page greets customers by name, but guest checkouts have no name: it's either `None` or
an empty string, depending on which form they came through. Write `display_name(name)` that returns
the name if there is one, and `"Guest"` otherwise:

```python
display_name("Ada")    # "Ada"
display_name("")       # "Guest"
display_name(None)     # "Guest"
```
