`read_pyvenv_cfg(text)` turns the contents of a venv's `pyvenv.cfg` into a dict, so a diagnostics
tool can report which Python a venv was made from. It works on the tidiest file, and nothing else.
Here's a real one, written by uv:

```text
home = /usr/local/bin
implementation = CPython
uv = 0.9.2
version_info = 3.14.0
include-system-site-packages = false
prompt = invoicer
```

```python
read_pyvenv_cfg(text)
# {"home": "/usr/local/bin", "implementation": "CPython", "uv": "0.9.2",
#  "version_info": "3.14.0", "include-system-site-packages": False, "prompt": "invoicer"}
```

Fix it so that:

- keys and values have no surrounding spaces, and blank lines are skipped;
- a value may itself contain `=` (the `command` line written by `python -m venv` does);
- `include-system-site-packages` is a real `bool`: `True` only for `true` (in any case), and
  `False` when it's `false` or missing.
