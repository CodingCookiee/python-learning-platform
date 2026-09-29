Build the rule ruff calls **E722**. Write `find_bare_excepts(source)`, which takes Python source code
as a string, finds every bare `except:` clause, and returns one message per clause, in the order
they appear in the file:

```text
<line>:<column>: E722 Do not use bare `except`
```

The line and column are where the `except` keyword starts, both counted from 1. A clause that names
an exception, even `except Exception:`, is fine. Don't run the code, only parse it.

```python
source = """import json

def load_settings(text):
    try:
        return json.loads(text)
    except:
        return {}
"""
find_bare_excepts(source)   # ["6:5: E722 Do not use bare `except`"]
```
