The shop's API server is configured with environment variables, and a typo in one should stop it at
startup, not at 3 a.m. Write a `Settings` model and `load_settings(environ, prefix="SHOP_")`.

| Variable | Field | Type | Default |
|----------|-------|------|---------|
| `SHOP_DATABASE_URL` | `database_url` | str | required |
| `SHOP_API_KEY` | `api_key` | `SecretStr` | required |
| `SHOP_DEBUG` | `debug` | bool | `False` |
| `SHOP_PORT` | `port` | int from 1 to 65535 | `8000` |
| `SHOP_ALLOWED_ORIGINS` | `allowed_origins` | list of str, from comma-separated text | `[]` |

- `load_settings` reads only the variables that start with the prefix, removes the prefix and
  lowercases the rest to get the field name. Everything else in the environment is ignored.
- `environ` is any `Mapping[str, str]`: the tests pass a dict, and a real program passes
  `os.environ`.
- The API key must never appear when settings are printed or logged.
- Settings can't be changed once loaded: assigning to a field raises `ValidationError`.
- Anything missing or invalid raises `ValidationError`, naming the field.

```python
env = {
    "SHOP_DATABASE_URL": "postgresql://shop@db/shop",
    "SHOP_API_KEY": "sk_live_51H8",
    "SHOP_DEBUG": "true",
    "SHOP_ALLOWED_ORIGINS": "https://shop.example.com, https://admin.example.com",
    "PATH": "/usr/bin",
}
settings = load_settings(env)
settings.debug, settings.port          # (True, 8000)
settings.allowed_origins               # ["https://shop.example.com", "https://admin.example.com"]
settings.api_key.get_secret_value()    # "sk_live_51H8"
print(settings)                        # ... api_key=SecretStr('**********') ...
```
