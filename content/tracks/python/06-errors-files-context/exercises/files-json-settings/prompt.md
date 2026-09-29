A point-of-sale app keeps its settings in a JSON file that shop managers sometimes edit by hand.
Write two functions:

**`save_settings(path, settings)`** writes the settings dict as UTF-8 JSON that people can read:
indented by 2 spaces, keys sorted, accented characters kept as they are, and a newline at the end.

**`load_settings(path, defaults)`** returns a **new** dict: the defaults, overridden by whatever the
file contains.

- If the file doesn't exist yet, return a copy of the defaults (and don't create the file).
- If it isn't valid JSON, raise `SettingsError("<file name> is not valid JSON (line <n>)")`,
  chained to the `json.JSONDecodeError`, where `<n>` is the line where parsing failed.
- If it's valid JSON but not an object, raise `SettingsError("<file name> must contain a JSON object")`.

The starter defines `SettingsError`, a `ValueError`.

```python
defaults = {"currency": "EUR", "theme": "light", "receipt_footer": "Merci !"}
save_settings(path, {"shop": "Café Lumière", "theme": "dark"})
load_settings(path, defaults)
# {"currency": "EUR", "theme": "dark", "receipt_footer": "Merci !", "shop": "Café Lumière"}
```

The file `save_settings` wrote contains:

```json
{
  "shop": "Café Lumière",
  "theme": "dark"
}
```
