Write `make_llm(env=os.environ, *, http=None)`, the one place your automations get an LLM from. It
reads the configuration from `env` (a dict in tests, the real environment in production) and returns
a ready client. Cut-down versions of both adapters are in the starter.

| Variable | Meaning |
|----------|---------|
| `LLM_PROVIDER` | `anthropic` (the default when it's not set) or `openai`, in any case, ignoring surrounding spaces |
| `ANTHROPIC_API_KEY` | required for Anthropic |
| `ANTHROPIC_MODEL` | optional; defaults to `DEFAULT_ANTHROPIC_MODEL` (`claude-haiku-4-5`) |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | both required for OpenAI: there's no default model, because OpenAI's line-up changes too often to bake one in |

- Use the `http` client you're given, or create `httpx.Client(base_url=..., timeout=60)` for the
  provider (`ANTHROPIC_URL` or `OPENAI_URL`).
- A required variable that's missing or blank raises `RuntimeError` whose message names the
  variable, for example `Set the OPENAI_MODEL environment variable`.
- Any other provider raises `ValueError` naming what was found.
- Log one INFO message with `log` (already set up in the starter) that names the provider and the
  model. The key must never appear in a log message, an error message or the client's `repr()`.

```python
llm = make_llm({"LLM_PROVIDER": "openai", "OPENAI_API_KEY": "sk-test-1", "OPENAI_MODEL": "gpt-fake"})
llm              # OpenAIClient(model='gpt-fake')
# logged: INFO Using openai with model gpt-fake
```
