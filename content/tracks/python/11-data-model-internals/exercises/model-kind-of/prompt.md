A debugging helper for a plugin loader needs to describe whatever it was handed. Write
`kind_of(value)` that returns:

- `"class"` for any class, built-in or your own,
- `"function"` for a function: one made with `def` or `lambda`, or a built-in like `len`,
- `"module"` for a module,
- `"instance of <TypeName>"` for anything else, using the name of its type.

```python
import json
from decimal import Decimal

kind_of(Decimal)            # "class"
kind_of(len)                # "function"
kind_of(json)               # "module"
kind_of(Decimal("9.99"))    # "instance of Decimal"
```
