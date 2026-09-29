Config files and packaging tools name code with strings like `"json:dumps"`: a module path, a
colon, then an attribute inside it. Write `load_object(spec)` that imports the module and returns
the object:

- The part after the colon may be dotted, to reach an attribute of an attribute.
- Text without exactly one colon, or with nothing before or after it, raises `ValueError`.
- A module that doesn't exist raises `ModuleNotFoundError`, and a missing attribute raises
  `AttributeError`, as the import and lookup would on their own.

```python
import datetime

load_object("json:dumps")                           # the json.dumps function
load_object("os.path:join")("reports", "q3.csv")    # 'reports/q3.csv'
load_object("datetime:date.fromisoformat")("2026-09-29") == datetime.date(2026, 9, 29)   # True
load_object("json.dumps")                           # ValueError
```
