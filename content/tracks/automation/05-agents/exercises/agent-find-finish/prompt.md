Write `finish_arguments(response)`, the check at the top of every agent step. Given an
`LLMResponse`, return the arguments of its first `finish` tool call, or `None` if it didn't call
`finish`.

```python
response = llm.complete(...)   # the model called finish(answer="Deploy d-4417 broke checkout. Roll it back.")
finish_arguments(response)     # {"answer": "Deploy d-4417 broke checkout. Roll it back."}
```
