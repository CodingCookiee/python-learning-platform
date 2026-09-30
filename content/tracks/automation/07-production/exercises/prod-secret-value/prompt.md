The invoice extractor logged its settings object at start-up, and the Anthropic key went to the
log provider with it. Write `Secret`, a small wrapper for keys and passwords that can't be printed
by accident:

- `Secret(value)` keeps the value; `.reveal()` returns it, for the one place that needs it.
- `str()` (so also `print` and f-strings) gives `**********` (`MASK`, ten asterisks), and `repr()`
  gives `Secret('**********')`, so a secret inside a dict, a dataclass or a traceback is masked
  too.
- Two `Secret`s are equal when their values are, compared with `hmac.compare_digest`.

Then write `secret_from_env(env, name)`, which reads the variable `name` from `env` (a mapping such
as `os.environ`) and returns it as a `Secret`. A missing or blank variable raises `RuntimeError`
naming the variable.

```python
key = secret_from_env({"ANTHROPIC_API_KEY": "sk-ant-test-4f9a"}, "ANTHROPIC_API_KEY")
print(f"Using key {key}")        # Using key **********
{"model": "claude-haiku-4-5", "key": key}   # {'model': 'claude-haiku-4-5', 'key': Secret('**********')}
key.reveal()                     # 'sk-ant-test-4f9a'
```
