Editors and tools find a project's venv by building two paths inside it: the interpreter to run and
the `site-packages` folder to index. The layout differs by operating system:

| | Linux and macOS | Windows |
|---|---|---|
| Interpreter | `bin/python` | `Scripts\python.exe` |
| Packages | `lib/python3.14/site-packages` | `Lib\site-packages` |

Write `venv_paths(venv, version, windows=False)` that returns a dict with the keys `"python"` and
`"site_packages"`, both strings, for a venv folder and a Python version such as `"3.14.2"`:

```python
venv_paths("/home/ada/invoicer/.venv", "3.14.2")
# {"python": "/home/ada/invoicer/.venv/bin/python",
#  "site_packages": "/home/ada/invoicer/.venv/lib/python3.14/site-packages"}

venv_paths(r"C:\Users\ada\invoicer\.venv", "3.14.2", windows=True)
# {"python": r"C:\Users\ada\invoicer\.venv\Scripts\python.exe",
#  "site_packages": r"C:\Users\ada\invoicer\.venv\Lib\site-packages"}
```

The result must use the right separators whichever OS the code runs on, so don't build the paths
from the current machine's rules.
