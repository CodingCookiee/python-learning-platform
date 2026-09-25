A service reads its settings from three places. Command-line flags win, then environment
variables, then the built-in defaults. Write `resolve_settings(cli, env, defaults)` that returns a
`ChainMap` of the three layers, in that order:

- **cli**: flags the user didn't pass arrive as `None`. Leave those out, so they don't hide a
  lower layer.
- **env**: only variables starting with `APP_` belong to this service. `APP_PORT` becomes the
  setting `port`, and `APP_LOG_LEVEL` becomes `log_level`. Keep the values as strings.
- **defaults**: used as it is.

```python
cli = {"port": None, "debug": True}
env = {"APP_PORT": "8080", "HOME": "/home/ada", "APP_LOG_LEVEL": "info"}
defaults = {"port": 8000, "debug": False, "workers": 2, "log_level": "warning"}

settings = resolve_settings(cli, env, defaults)
settings["port"], settings["debug"], settings["workers"], settings["log_level"]
# ("8080", True, 2, "info")
```

Don't modify any of the three dicts you're given. Setting a value on the result should change
only the command-line layer.
