Write `build_prompt(question, chunks)` for Castlegate Legal's FAQ bot. It returns a pair
`(system, messages)` ready for `llm.complete(messages, system=system)`.

- `system` is the starter's `SYSTEM` constant, unchanged.
- `messages` is a single user message. Its content lists the chunks as numbered sources, starting
  at **1**, inside `<sources>` tags, then a blank line and the question:

```text
<sources>
<source id="1" title="Deposit protection">
Your landlord must protect your deposit in a government-approved scheme within 30 days of receiving it.
</source>
<source id="2" title="Unprotected deposits">
If your deposit isn't protected, you can claim between one and three times its value at court.
</source>
</sources>

Question: How long does my landlord have to protect my deposit?
```

- Each chunk is a dict with at least `"title"` and `"text"`.
- The sources are data, so none of them may appear in the system prompt.
- With no chunks there's nothing to ground an answer in: raise `ValueError` (the caller should
  refuse without calling the model).
