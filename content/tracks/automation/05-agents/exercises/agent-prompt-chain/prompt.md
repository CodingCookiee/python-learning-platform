Write `run_chain(llm, steps, text, *, system=None)`. Each step is a prompt template containing
`{input}`. Run them in order: the first step's `{input}` is `text`, and each later step's is the
previous step's reply, stripped of surrounding whitespace. Return the last reply (stripped).

Each step is one call with a single user message (the template with `{input}` replaced, using
`str.replace`, since templates can contain other braces) and the `system` prompt.

```python
steps = ["List the facts from this sales call as bullets:\n{input}",
         "Write a two-sentence follow-up email from these facts:\n{input}"]
run_chain(llm, steps, TRANSCRIPT)   # the follow-up email
```
