The invoicer's logging settings are moving out of the code and into `logging.toml`, so whoever runs
the app can change them without editing Python. The file holds the same keys a `dictConfig` dict
does, written as TOML tables. Finish both files.

**In `main.py`:** `configure(path="logging.toml", verbose=False)` reads the TOML file at `path` with
`tomllib`, and applies it with `logging.config.dictConfig`. With `verbose=True` the console handler
shows `DEBUG` messages too. Change the loaded dict before applying it, not the file.

**In `logging.toml`:** once applied, the config does this:

| Where | What gets there | Each line looks like |
|-------|-----------------|----------------------|
| the console (`ext://sys.stdout`) | `INFO` and up (`DEBUG` too when verbose) | `INFO invoicer.billing: charged INV-1042 for 1950p` |
| the file `invoicer.log` | everything from `DEBUG` up | `2026-10-01 09:30:00,123 DEBUG invoicer.billing: charging INV-1042 for 1950p` |

- The `httpx` logger only gets through at `WARNING` or above, on both handlers.
- `invoicer/billing.py` (read-only) creates its logger when `main.py` imports it, before
  `configure` runs. Its messages must still come through.

The starter file has a console handler already. Open the `invoicer/billing.py` tab to see what it
logs.
