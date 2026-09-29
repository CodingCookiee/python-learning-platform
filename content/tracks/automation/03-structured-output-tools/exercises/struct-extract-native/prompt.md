Write `extract_native(llm, document, model_cls, *, system)`, which extracts a Pydantic model using
the client's `schema=` feature, and still works on a client that doesn't have it.

1. Send one user message with the document between `<document>` and `</document>` tags, each on
   its own line, with the given `system` prompt, `temperature=0`, and
   `schema=strict_schema(model_cls.model_json_schema())` (`strict_schema` is in the starter).
2. If the client raises `NotImplementedError` (its model has no structured outputs), send the same
   message again **without** `schema=`, and with this appended to the system prompt:
   `"\n\nReply with only a JSON object that matches this JSON schema:\n"` followed by
   `json.dumps(schema)`.
3. Whichever call answered: if it stopped at `max_tokens`, raise `ExtractionFailed` with a message
   containing `max_tokens`. If it stopped with `"refusal"`, raise `ExtractionFailed` with a
   message containing `refused`.
4. Otherwise return the reply validated as `model_cls`. A reply that matches the schema but breaks
   the model's rules (a negative total, say) raises Pydantic's `ValidationError`, which you let
   through for the caller to handle.

```python
llm = ScriptedLLM(['{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "total": 1240.5}'])
invoice = extract_native(llm, "Invoice INV-2291 ...", Invoice, system="Extract the invoice.")
invoice.total                                  # 1240.5
llm.calls[0]["schema"]["required"]             # ["invoice_number", "vendor", "total"]
llm.calls[0]["schema"]["additionalProperties"] # False
```
