The support bot caches model responses under `cache_key(...)`. After the team moved hard questions
to a larger model, and tried a warmer system prompt at `temperature=0.7`, some customers got
answers from the *old* prompt and the small model. The key only hashes the messages, so any two
requests with the same question share a cached answer.

Fix `cache_key` so the key changes when **any** of its arguments changes: the model, the system
prompt, the messages, the tools, the temperature or `max_tokens`. It must stay the same for
equal requests whatever order their dict keys are in, and still be a 64-character SHA-256 hex
digest.

```python
question = [{"role": "user", "content": "How long do refunds take?"}]
cache_key("model-small", "You are Kiln & Co's support bot.", question, temperature=0)
# '3b0c…' (64 hex characters)
cache_key("model-large", "You are Kiln & Co's support bot.", question, temperature=0)
# a different key
```
