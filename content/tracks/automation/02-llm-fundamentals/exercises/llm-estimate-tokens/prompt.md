Before sending a ticket to a model you want a quick estimate of how many tokens it will use. Write
two functions using the four-characters-per-token rule of thumb:

- `estimate_tokens(text)` returns the number of tokens in `text`: its length divided by 4, rounded
  **up**. Empty text is `0` tokens.
- `prompt_tokens(messages, system=None)` returns the estimate for a whole request: the system prompt
  (if there is one) plus the `content` of every message, each estimated separately and added up.

```python
estimate_tokens("Where is my order #1042?")    # 6  (24 characters)
estimate_tokens("")                            # 0

prompt_tokens(
    [{"role": "user", "content": "Where is my order #1042?"}],
    system="You are a support agent.",      # 24 characters, 6 tokens
)                                              # 12
```
