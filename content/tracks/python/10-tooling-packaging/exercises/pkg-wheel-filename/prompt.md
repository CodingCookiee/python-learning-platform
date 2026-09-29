A wheel's filename has five parts separated by dashes: the name, the version, the Python tag, the
ABI tag and the platform tag. Write `parse_wheel_filename(filename)` that returns them as a dict:

```python
parse_wheel_filename("invoicer_ada-0.1.0-py3-none-any.whl")
# {"name": "invoicer_ada", "version": "0.1.0", "python": "py3", "abi": "none", "platform": "any"}
```

Raise `ValueError` if the filename doesn't end in `.whl`, or doesn't have exactly five parts.
