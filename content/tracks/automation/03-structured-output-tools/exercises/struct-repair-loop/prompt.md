Every extraction in your automations will need the same loop, so write it once, for any Pydantic
model:

```python
extract_with_repair(llm, document, model_cls, *, system, max_attempts=3) -> Extraction
```

1. Start the conversation with one user message: the document between `<document>` and
   `</document>` tags, each on its own line. Send it with the given `system` prompt and
   `temperature=0`.
2. Find the JSON object in the reply and validate it with `model_cls`. On success, return an
   `Extraction` (defined in the starter) with the validated value, the number of attempts used,
   and the input and output tokens summed over **every** call.
3. On failure, append the reply as an assistant message, then a user message that contains the
   problems (from `validation_feedback`, or the `ValueError` message when there was no JSON) and
   asks for the corrected JSON object only. Then try again.
4. Make at most `max_attempts` calls. When they're used up, raise `ExtractionFailed` with the last
   problems and the last reply.
5. A reply cut off at `max_tokens` can't be repaired with the same limit: raise `ExtractionFailed`
   at once, with problems that mention `max_tokens`.

```python
llm = ScriptedLLM([
    '{"vendor": "Kiln Supplies", "total": "1240.50"}',                            # no invoice_number
    '{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "total": "1240.50"}',
])
result = extract_with_repair(llm, "Invoice INV-2291 ...", Invoice, system=INVOICE_SYSTEM)
result.value.invoice_number   # "INV-2291"
result.attempts               # 2
[m["role"] for m in llm.calls[1]["messages"]]   # ["user", "assistant", "user"]
llm.calls[1]["messages"][2]["content"]          # contains "invoice_number: Field required"
```
