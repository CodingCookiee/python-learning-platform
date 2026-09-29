Linters let you silence a rule on one line with a `# noqa` comment. Write
`suppressed(line, code)`, which returns `True` if the line's comment silences the rule `code`:

- `# noqa` on its own silences **every** rule on that line.
- `# noqa: E722, F401` silences only the codes listed, which may be separated by commas, spaces or
  both. Anything after the codes is an explanation and doesn't count.
- A code must match exactly: `# noqa: E72` doesn't silence `E722`.
- `noqa` may be written in any case, with or without a space after `#`.

```python
suppressed("    except:  # noqa: E722", "E722")    # True
suppressed("    except:  # noqa: E722", "F401")    # False
suppressed("import os  # noqa", "F401")             # True
suppressed("import os", "F401")                     # False
```
