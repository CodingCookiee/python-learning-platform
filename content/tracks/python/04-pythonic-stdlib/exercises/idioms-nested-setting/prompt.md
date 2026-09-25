Services load their settings from nested config like this:

```python
config = {
    "database": {"host": "db.internal", "port": 5432},
    "debug": False,
    "workers": 4,
}
```

Write `get_setting(config, path, default=None)`, where `path` is dotted, like `"database.host"`.
It returns the value at that path, or `default` if the path doesn't lead anywhere:

```python
get_setting(config, "database.host")               # "db.internal"
get_setting(config, "workers")                      # 4
get_setting(config, "database.user", "postgres")    # "postgres"
get_setting(config, "cache.ttl")                    # None
```

A path can also run into a value that isn't a dict, like `"workers.max"` (4 has no keys) or
`"database.host.name"`. Those get the default too. A stored value that happens to be falsy, like
`"debug"`, is still a real value and must come back as it is.
