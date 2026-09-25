Sorting release numbers as strings puts `"1.10.0"` before `"1.9.3"`. Write a `Version` class that
compares them properly.

- `Version(text)` parses `"1.10.2"` into the integer attributes `major`, `minor` and `patch`. A
  leading `"v"` is allowed (`"v2.0.1"`), and missing parts are zero, so `"1.2"` means `1.2.0`.
  Raise `ValueError` for anything else, such as `"1.x"` or `"1.2.3.4"`.
- `str()` gives `"1.10.2"` and `repr()` gives `"Version('1.10.2')"`, always with all three parts.
- Versions support `==`, `<`, `<=`, `>` and `>=`, and can go in sets and dict keys.
  `Version("1.2") == Version("1.2.0")`.
- `bump(part)` returns a new version with `"major"`, `"minor"` or `"patch"` raised by one, and the
  parts after it reset to zero.

```python
releases = [Version("1.10.0"), Version("v1.2"), Version("1.9.3")]
sorted(releases)
# [Version('1.2.0'), Version('1.9.3'), Version('1.10.0')]
max(releases).bump("minor")   # Version('1.11.0')
Version("1.2") == Version("1.2.0")   # True
```

Compared with something that isn't a `Version`, `==` gives `False` and `<` raises `TypeError`.
