Environment settings arrive as text, and callers want them in different forms. Write
`get_setting(env, name, default)` with three `@overload` signatures, so mypy knows the return type
from how it's called:

| Call | Returns | mypy sees |
|------|---------|-----------|
| `get_setting(env, "SHOP_TOKEN")` | the text, or `None` if the name isn't set | `str` or `None` |
| `get_setting(env, "SHOP_HOST", "localhost")` | the text, or the default | `str` |
| `get_setting(env, "SHOP_PORT", 8000)` | the text converted to an int, or the default | `int` |

`env` is any `Mapping[str, str]` (pass `os.environ` in a real program). If a value can't be
converted to an int, raise `ValueError("SHOP_PORT must be a whole number, got 'eighty'")`.

```python
env = {"SHOP_HOST": "shop.example.com", "SHOP_PORT": "9000"}
get_setting(env, "SHOP_HOST", "localhost")    # "shop.example.com"
get_setting(env, "SHOP_PORT", 8000)           # 9000
get_setting(env, "SHOP_WORKERS", 4)           # 4
get_setting(env, "SHOP_TOKEN")                # None
```

`mypy --strict` must pass. With the overloads in place, `port: int = get_setting(env, "SHOP_PORT",
8000)` type-checks with no narrowing, and `token: str = get_setting(env, "SHOP_TOKEN")` is an error.
