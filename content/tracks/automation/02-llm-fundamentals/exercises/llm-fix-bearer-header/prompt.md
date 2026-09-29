A colleague copied the Anthropic call from the lesson and pointed it at OpenAI's Chat Completions
API. Every request now fails:

```text
httpx.HTTPStatusError: Client error '401 Unauthorized' for url 'https://api.openai.com/v1/chat/completions'
```

`ask_gpt(http, question, *, api_key, model)` should send `question` as one user message and return
the reply text. Fix it so OpenAI accepts the key, and send the key only in the header OpenAI uses.

```python
http = httpx.Client(base_url="https://api.openai.com", timeout=60)
ask_gpt(http, "Which plan includes SSO?", api_key=os.environ["OPENAI_API_KEY"],
        model=os.environ["OPENAI_MODEL"])
# "SSO is included in the Business plan."
```
